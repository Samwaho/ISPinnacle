declare module "mikronode-ng2" {
  export interface ConnectionOptions {
    port?: number;
    timeout?: number;
    closeOnDone?: boolean;
    closeOnTimeout?: boolean;
    tls?: boolean | Record<string, unknown>;
  }

  export interface CommandOptions {
    closeOnDone?: boolean;
    dontParse?: boolean;
    dataClass?: new (data: unknown) => unknown;
    itemClass?: new (data: unknown) => unknown;
    itemKey?: string;
  }

  export class Connection {
    constructor(host: string, user: string, password: string, options?: ConnectionOptions);
    getConnectPromise(): Promise<this>;
    getCommandPromise(
      data: string,
      parameters?: string[] | string | null,
      options?: CommandOptions
    ): Promise<unknown>;
    openChannel(): unknown;
    close(): void;
  }

  export function getConnection(
    host: string,
    user: string,
    password: string,
    options?: ConnectionOptions
  ): Connection;

  export function parseItems(data: unknown): unknown[];

  const MikroNode: {
    Connection: typeof Connection;
    getConnection: typeof getConnection;
    parseItems: typeof parseItems;
  };

  export default MikroNode;
}
