import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../schema";
import { withDbRetry } from "./retry";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  return url
    .replace(/([?&])channel_binding=require&?/g, "$1")
    .replace(/[?&]$/, "");
};

const createRetryingClient = (
  connectionString: string,
): NeonQueryFunction<false, false> => {
  const baseSql = neon(connectionString, {
    fetchOptions: {
      cache: "no-store",
    },
  });

  const client = ((strings, ...values) =>
    withDbRetry(() => baseSql(strings, ...values))) as NeonQueryFunction<
    false,
    false
  >;

  client.query = ((query, params, options) =>
    withDbRetry(() => baseSql.query(query, params, options))) as typeof baseSql.query;

  if (baseSql.unsafe) {
    client.unsafe = baseSql.unsafe;
  }

  if (baseSql.transaction) {
    client.transaction = ((queries, options) =>
      withDbRetry(() => baseSql.transaction!(queries, options))) as typeof baseSql.transaction;
  }

  return client;
};

export const db = drizzle(createRetryingClient(getDatabaseUrl()), { schema });
