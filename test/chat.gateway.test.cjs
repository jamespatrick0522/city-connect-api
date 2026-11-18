const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

function loadTypeScript(filename) {
  const localRequire = createRequire(filename);
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true,
      emitDecoratorMetadata: false,
    },
  });
  const requireSource = (name) => name === './chat.constants'
    ? loadTypeScript(path.resolve(path.dirname(filename), 'chat.constants.ts'))
    : localRequire(name);
  new Function('require', 'module', 'exports', outputText)(requireSource, module, module.exports);
  return module.exports;
}

const { ChatGateway } = loadTypeScript(path.resolve(__dirname, '../src/modules/messages/chat.gateway.ts'));
const { CHAT_EVENTS, buildEstablishmentRoom, buildGuestConversationRooms } = loadTypeScript(
  path.resolve(__dirname, '../src/modules/messages/chat.constants.ts'),
);

for (const identifiers of [
  { guestEmail: 'tourist@example.com' },
  { guestPhone: '09123456789' },
  { guestEmail: 'tourist@example.com', guestPhone: '09123456789' },
]) {
  for (const [method, event] of [
    ['emitNewMessage', CHAT_EVENTS.MESSAGE_NEW],
    ['emitMessageSent', CHAT_EVENTS.MESSAGE_SENT],
    ['emitMessageFailed', CHAT_EVENTS.MESSAGE_FAILED],
  ]) {
    test(`${method} delivers once to overlapping rooms: ${JSON.stringify(identifiers)}`, () => {
      const establishmentId = 'business-1';
      const rooms = [
        buildEstablishmentRoom(establishmentId),
        ...buildGuestConversationRooms(establishmentId, identifiers.guestEmail, identifiers.guestPhone),
      ];
      const sockets = [
        { rooms: new Set(rooms), events: [] },
        { rooms: new Set([rooms[0]]), events: [] },
        { rooms: new Set(rooms.slice(1)), events: [] },
        { rooms: new Set(['chat:establishment:unrelated']), events: [] },
      ];
      const broadcasts = [];
      const gateway = new ChatGateway({}, {}, {}, {});
      gateway.server = {
        to(target) {
          const targets = Array.isArray(target) ? target : [target];
          return {
            emit(name, payload) {
              broadcasts.push({ targets, name, payload });
              for (const socket of sockets) {
                if (targets.some((room) => socket.rooms.has(room))) {
                  socket.events.push({ name, payload });
                }
              }
            },
          };
        },
      };
      const message = { id: 'message-1', establishmentId, ...identifiers, message: 'Hello' };
      const payload = method === 'emitNewMessage' ? message
        : method === 'emitMessageSent' ? { clientRequestId: 'request-1', message }
          : { establishmentId, ...identifiers, clientRequestId: 'request-1', reason: 'Failed' };

      gateway[method](payload);

      assert.equal(broadcasts.length, 1);
      assert.deepEqual(new Set(broadcasts[0].targets), new Set(rooms));
      for (const socket of sockets.slice(0, 3)) {
        assert.deepEqual(socket.events, [{ name: event, payload }]);
      }
      assert.equal(sockets[3].events.length, 0);
    });
  }
}
