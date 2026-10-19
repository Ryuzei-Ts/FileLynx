import * as ftp from 'basic-ftp';

export const ftpService = {
  async testConnection(options: ftp.AccessOptions): Promise<boolean> {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
      await client.access(options);
      await client.close();
      return true;
    } catch {
      client.close();
      return false;
    }
  },

  async listRemote(options: ftp.AccessOptions, remotePath = '/'): Promise<ftp.FileInfo[]> {
    const client = new ftp.Client();
    try {
      await client.access(options);
      const list = await client.list(remotePath);
      client.close();
      return list;
    } catch (err) {
      client.close();
      throw err;
    }
  },
};
