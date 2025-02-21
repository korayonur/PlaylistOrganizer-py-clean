export class PlaylistError extends Error {
  constructor(
    public code: string,
    override message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "PlaylistError";
  }
}
