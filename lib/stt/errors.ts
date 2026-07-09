export class SttError extends Error {
  constructor(
    message: string,
    public readonly code?: string | number,
  ) {
    super(message);
    this.name = "SttError";
  }
}
