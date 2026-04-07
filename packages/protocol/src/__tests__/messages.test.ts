import { describe, it, expect } from "vitest";
import { clientMessageSchema, serverMessageSchema } from "../index.js";

describe("clientMessageSchema", () => {
  it("parses join message", () => {
    const msg = { type: "join", payload: { gameId: "abc", playerName: "Alice" } };
    expect(clientMessageSchema.parse(msg)).toEqual(msg);
  });

  it("parses select_tile message", () => {
    const msg = { type: "select_tile", payload: { tileId: "1,0" } };
    expect(clientMessageSchema.parse(msg)).toEqual(msg);
  });

  it("parses select_words message", () => {
    const msg = { type: "select_words", payload: { words: ["Batman", "Maraca"] } };
    expect(clientMessageSchema.parse(msg)).toEqual(msg);
  });

  it("parses lock_in message", () => {
    const msg = { type: "lock_in" };
    expect(clientMessageSchema.parse(msg)).toEqual(msg);
  });

  it("parses ready message", () => {
    const msg = { type: "ready" };
    expect(clientMessageSchema.parse(msg)).toEqual(msg);
  });

  it("parses change_seed message", () => {
    const msg = { type: "change_seed", payload: { direction: "next" } };
    expect(clientMessageSchema.parse(msg)).toEqual(msg);
  });

  it("parses change_seed prev message", () => {
    const msg = { type: "change_seed", payload: { direction: "prev" } };
    expect(clientMessageSchema.parse(msg)).toEqual(msg);
  });

  it("rejects empty player name", () => {
    const msg = { type: "join", payload: { gameId: "abc", playerName: "" } };
    expect(() => clientMessageSchema.parse(msg)).toThrow();
  });

  it("rejects unknown message type", () => {
    const msg = { type: "unknown_type" };
    expect(() => clientMessageSchema.parse(msg)).toThrow();
  });

  it("rejects missing payload", () => {
    const msg = { type: "join" };
    expect(() => clientMessageSchema.parse(msg)).toThrow();
  });
});

describe("serverMessageSchema", () => {
  it("parses game_state message", () => {
    const msg = {
      type: "game_state",
      payload: {
        id: "g1",
        phase: "selecting",
        tileIds: ["0,0", "1,0"],
        round: 1,
        config: {
          playerCount: 3,
          tileMultiplier: 2.5,
          wordList: ["Batman"],
          seed: 42,
          maxWordsPerPlayer: 3,
        },
        seedAdvances: 0,
        self: {
          id: "p1",
          name: "Alice",
          selectedTile: null,
          selectedWords: [],
          lockedIn: false,
          readyForNext: false,
        },
        others: [],
      },
    };
    expect(serverMessageSchema.parse(msg)).toEqual(msg);
  });

  it("parses phase_changed message", () => {
    const msg = { type: "phase_changed", payload: { phase: "selecting" } };
    expect(serverMessageSchema.parse(msg)).toEqual(msg);
  });

  it("parses player_joined message", () => {
    const msg = { type: "player_joined", payload: { playerId: "p1", name: "Alice" } };
    expect(serverMessageSchema.parse(msg)).toEqual(msg);
  });

  it("parses player_left message", () => {
    const msg = { type: "player_left", payload: { playerId: "p1" } };
    expect(serverMessageSchema.parse(msg)).toEqual(msg);
  });

  it("parses error message", () => {
    const msg = { type: "error", payload: { message: "Something went wrong" } };
    expect(serverMessageSchema.parse(msg)).toEqual(msg);
  });

  it("parses round_result message", () => {
    const msg = {
      type: "round_result",
      payload: {
        round: 1,
        selections: { p1: "0,0", p2: "1,0" },
        collisions: [],
        scores: { p1: 1, p2: 1 },
      },
    };
    expect(serverMessageSchema.parse(msg)).toEqual(msg);
  });

  it("rejects invalid phase", () => {
    const msg = { type: "phase_changed", payload: { phase: "invalid_phase" } };
    expect(() => serverMessageSchema.parse(msg)).toThrow();
  });
});
