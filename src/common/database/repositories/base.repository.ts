import { Injectable } from '@nestjs/common';
import { InferInsertModel, InferSelectModel, SQL, sql } from 'drizzle-orm';
import { AnyPgTable } from 'drizzle-orm/pg-core';

import { AppDb } from '../database.types';

export interface FindManyOptions {
  where?: SQL<unknown>;
  limit?: number;
  offset?: number;
  orderBy?: any;
}

@Injectable()
export abstract class BaseRepository<TTable extends AnyPgTable> {
  protected constructor(
    protected readonly db: AppDb,
    protected readonly table: TTable,
  ) {}

  async create(payload: InferInsertModel<TTable>): Promise<InferSelectModel<TTable>> {
    const [created] = await this.db
      .insert(this.table)
      .values(payload as InferInsertModel<TTable>)
      .returning();

    return created as InferSelectModel<TTable>;
  }

  async findById(id: string): Promise<InferSelectModel<TTable> | null> {
    const idColumn = (this.table as any).id;
    if (!idColumn) {
      throw new Error('Table does not expose an id column for findById.');
    }

    const [row] = await this.db
      .select()
      .from(this.table as any)
      .where(sql`${idColumn} = ${id}`)
      .limit(1);

    return (row as InferSelectModel<TTable> | undefined) ?? null;
  }

  async findOne(where: SQL<unknown>): Promise<InferSelectModel<TTable> | null> {
    const [row] = await this.db.select().from(this.table as any).where(where).limit(1);
    return (row as InferSelectModel<TTable> | undefined) ?? null;
  }

  async findMany(options: FindManyOptions = {}): Promise<InferSelectModel<TTable>[]> {
    const query = this.db.select().from(this.table as any).$dynamic();

    if (options.where) query.where(options.where);
    if (options.orderBy) query.orderBy(options.orderBy);
    if (typeof options.limit === 'number') query.limit(options.limit);
    if (typeof options.offset === 'number') query.offset(options.offset);

    return (await query) as InferSelectModel<TTable>[];
  }

  async update(
    where: SQL<unknown>,
    payload: Partial<InferInsertModel<TTable>>,
  ): Promise<InferSelectModel<TTable> | null> {
    const [updated] = await this.db
      .update(this.table)
      .set(payload as InferInsertModel<TTable>)
      .where(where)
      .returning();

    return (updated as InferSelectModel<TTable> | undefined) ?? null;
  }

  async delete(where: SQL<unknown>): Promise<boolean> {
    const deletedRows = await this.db.delete(this.table).where(where).returning();
    return deletedRows.length > 0;
  }

  async deleteById(id: string): Promise<boolean> {
    const idColumn = (this.table as any).id;
    if (!idColumn) {
      throw new Error('Table does not expose an id column for deleteById.');
    }

    const deletedRows = await this.db
      .delete(this.table)
      .where(sql`${idColumn} = ${id}`)
      .returning();

    return deletedRows.length > 0;
  }

  async count(where?: SQL<unknown>): Promise<number> {
    const query = this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.table as any)
      .$dynamic();

    if (where) query.where(where);

    const [result] = await query;
    return Number(result?.count ?? 0);
  }
}

