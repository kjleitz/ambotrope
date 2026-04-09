import { describe, it, expect } from "vitest";
import {
  createGame,
  addPlayer,
  removePlayer,
  changeSeed,
  selectTile,
  selectWords,
  lockIn,
  allLockedIn,
  revealRound,
  startNewRound,
  getPlayerView,
  scoreRound,
  initiateKickVote,
  castKickVote,
  cancelKickVote,
  isKickVoteUnanimous,
  executeKick,
  DEFAULT_WORD_LIST,
} from "../index.js";
import type { GameConfig, GameState } from "../index.js";

const TEST_CONFIG: GameConfig = {
  playerCount: 3,
  tileMultiplier: 2.5,
  wordList: DEFAULT_WORD_LIST,
  seed: 42,
  maxWordsPerPlayer: 3,
};

const TEST_TILES = ["0,0", "1,0", "0,1", "-1,1", "-1,0", "0,-1", "1,-1"];

function setupSelecting(): GameState {
  let state = createGame("test-game", TEST_CONFIG, TEST_TILES);
  state = addPlayer(state, "p1", "Alice");
  state = addPlayer(state, "p2", "Bob");
  state = addPlayer(state, "p3", "Carol");
  return state;
}

function setupReveal(): GameState {
  let state = setupSelecting();
  state = selectTile(state, "p1", "0,0");
  state = selectTile(state, "p2", "1,0");
  state = selectTile(state, "p3", "0,1");
  state = selectWords(state, "p1", ["batman", "butterfly"]);
  state = selectWords(state, "p2", ["maraca", "egg"]);
  state = selectWords(state, "p3", ["lungs"]);
  state = lockIn(state, "p1");
  state = lockIn(state, "p2");
  state = lockIn(state, "p3");
  return revealRound(state);
}

describe("createGame", () => {
  it("creates a game in selecting phase", () => {
    const state = createGame("g1", TEST_CONFIG, TEST_TILES);
    expect(state.id).toBe("g1");
    expect(state.phase).toBe("selecting");
    expect(state.round).toBe(1);
    expect(state.tileIds).toEqual(TEST_TILES);
    expect(Object.keys(state.players)).toHaveLength(0);
  });
});

describe("addPlayer", () => {
  it("adds a player during selecting phase", () => {
    let state = createGame("g1", TEST_CONFIG, TEST_TILES);
    state = addPlayer(state, "p1", "Alice");
    expect(state.players["p1"]).toBeDefined();
    expect(state.players["p1"].name).toBe("Alice");
    expect(state.players["p1"].selectedTile).toBeNull();
  });

  it("throws if game is in reveal", () => {
    const state = setupReveal();
    expect(() => addPlayer(state, "p4", "Dave")).toThrow("reveal");
  });

  it("throws for duplicate player ID", () => {
    let state = createGame("g1", TEST_CONFIG, TEST_TILES);
    state = addPlayer(state, "p1", "Alice");
    expect(() => addPlayer(state, "p1", "Alice2")).toThrow("already exists");
  });
});

describe("removePlayer", () => {
  it("removes an existing player", () => {
    let state = createGame("g1", TEST_CONFIG, TEST_TILES);
    state = addPlayer(state, "p1", "Alice");
    state = removePlayer(state, "p1");
    expect(state.players["p1"]).toBeUndefined();
  });

  it("throws for unknown player", () => {
    const state = createGame("g1", TEST_CONFIG, TEST_TILES);
    expect(() => removePlayer(state, "p1")).toThrow("not found");
  });
});

describe("changeSeed", () => {
  it("advances the seed by 1", () => {
    const state = setupSelecting();
    const next = changeSeed(state, "next");
    expect(next.seedAdvances).toBe(1);
    expect(next.config.seed).toBe(state.baseSeed + 1);
  });

  it("can advance multiple times", () => {
    let state = setupSelecting();
    state = changeSeed(state, "next");
    state = changeSeed(state, "next");
    state = changeSeed(state, "next");
    expect(state.seedAdvances).toBe(3);
    expect(state.config.seed).toBe(state.baseSeed + 3);
  });

  it("can undo back to original", () => {
    let state = setupSelecting();
    state = changeSeed(state, "next");
    state = changeSeed(state, "next");
    state = changeSeed(state, "prev");
    expect(state.seedAdvances).toBe(1);
    state = changeSeed(state, "prev");
    expect(state.seedAdvances).toBe(0);
    expect(state.config.seed).toBe(state.baseSeed);
  });

  it("throws when undoing past original seed", () => {
    const state = setupSelecting();
    expect(() => changeSeed(state, "prev")).toThrow("original seed");
  });

  it("throws in reveal phase", () => {
    const state = setupReveal();
    expect(() => changeSeed(state, "next")).toThrow("selecting");
  });

  it("is reflected in player view", () => {
    let state = setupSelecting();
    state = changeSeed(state, "next");
    const view = getPlayerView(state, "p1");
    expect(view.seedAdvances).toBe(1);
    expect(view.config.seed).toBe(state.baseSeed + 1);
  });
});

describe("selectTile", () => {
  it("sets the player's tile during selecting", () => {
    let state = setupSelecting();
    state = selectTile(state, "p1", "0,0");
    expect(state.players["p1"].selectedTile).toBe("0,0");
  });

  it("allows changing tile during selecting", () => {
    let state = setupSelecting();
    state = selectTile(state, "p1", "0,0");
    state = selectTile(state, "p1", "1,0");
    expect(state.players["p1"].selectedTile).toBe("1,0");
  });

  it("throws for invalid tile", () => {
    const state = setupSelecting();
    expect(() => selectTile(state, "p1", "99,99")).toThrow("not in the grid");
  });

  it("throws if locked in", () => {
    let state = setupSelecting();
    state = lockIn(state, "p1");
    expect(() => selectTile(state, "p1", "1,-1")).toThrow("locking in");
  });

  it("throws in wrong phase", () => {
    const state = setupReveal();
    expect(() => selectTile(state, "p1", "0,0")).toThrow("phase");
  });
});

describe("selectWords", () => {
  it("sets words during selecting", () => {
    let state = setupSelecting();
    state = selectWords(state, "p1", ["batman", "beard"]);
    expect(state.players["p1"].selectedWords).toEqual(["batman", "beard"]);
  });

  it("allows selecting words before selecting a tile", () => {
    let state = setupSelecting();
    state = selectWords(state, "p1", ["batman"]);
    expect(state.players["p1"].selectedWords).toEqual(["batman"]);
    expect(state.players["p1"].selectedTile).toBeNull();
  });

  it("throws for too many words", () => {
    const state = setupSelecting();
    expect(() =>
      selectWords(state, "p1", ["batman", "maraca", "beard", "🌮"]),
    ).toThrow("more than 3");
  });

  it("accepts free-text words not in the word list", () => {
    let state = setupSelecting();
    state = selectWords(state, "p1", ["customword"]);
    expect(state.players["p1"].selectedWords).toEqual(["customword"]);
  });

  it("accepts emoji words", () => {
    let state = setupSelecting();
    state = selectWords(state, "p1", ["hello", "🎉"]);
    expect(state.players["p1"].selectedWords).toEqual(["hello", "🎉"]);
  });

  it("throws for words with spaces", () => {
    const state = setupSelecting();
    expect(() => selectWords(state, "p1", ["hello world"])).toThrow(
      "invalid characters",
    );
  });

  it("throws for words with special characters", () => {
    const state = setupSelecting();
    expect(() => selectWords(state, "p1", ["hello!"])).toThrow(
      "invalid characters",
    );
  });

  it("throws for empty words", () => {
    const state = setupSelecting();
    expect(() => selectWords(state, "p1", [""])).toThrow("between 1 and 50");
  });

  it("throws for words exceeding max length", () => {
    const state = setupSelecting();
    const longWord = "a".repeat(51);
    expect(() => selectWords(state, "p1", [longWord])).toThrow(
      "between 1 and 50",
    );
  });

  it("throws in wrong phase", () => {
    const state = setupReveal();
    expect(() => selectWords(state, "p1", ["batman"])).toThrow("selecting");
  });
});

describe("lockIn", () => {
  it("locks player in during selecting", () => {
    let state = setupSelecting();
    state = lockIn(state, "p1");
    expect(state.players["p1"].lockedIn).toBe(true);
  });

  it("throws in wrong phase", () => {
    const state = setupReveal();
    expect(() => lockIn(state, "p1")).toThrow();
  });
});

describe("allLockedIn", () => {
  it("returns false when not all locked in", () => {
    let state = setupSelecting();
    state = lockIn(state, "p1");
    expect(allLockedIn(state)).toBe(false);
  });

  it("returns true when all locked in with 2+ players", () => {
    let state = setupSelecting();
    state = lockIn(state, "p1");
    state = lockIn(state, "p2");
    state = lockIn(state, "p3");
    expect(allLockedIn(state)).toBe(true);
  });

  it("returns false with only 1 player", () => {
    let state = createGame("g1", TEST_CONFIG, TEST_TILES);
    state = addPlayer(state, "p1", "Alice");
    state = lockIn(state, "p1");
    expect(allLockedIn(state)).toBe(false);
  });
});

describe("revealRound", () => {
  it("advances selecting -> reveal", () => {
    let state = setupSelecting();
    state = lockIn(state, "p1");
    state = lockIn(state, "p2");
    state = lockIn(state, "p3");
    const next = revealRound(state);
    expect(next.phase).toBe("reveal");
  });

  it("throws in wrong phase", () => {
    const state = setupReveal();
    expect(() => revealRound(state)).toThrow("selecting");
  });
});

describe("startNewRound", () => {
  it("resets player state and increments round", () => {
    const state = setupReveal();
    const next = startNewRound(state);
    expect(next.phase).toBe("selecting");
    expect(next.round).toBe(2);
    for (const player of Object.values(next.players)) {
      expect(player.selectedTile).toBeNull();
      expect(player.selectedWords).toEqual([]);
      expect(player.lockedIn).toBe(false);
    }
  });

  it("throws if not in reveal phase", () => {
    const state = setupSelecting();
    expect(() => startNewRound(state)).toThrow("reveal");
  });
});

describe("getPlayerView", () => {
  it("includes self state with selected tile", () => {
    let state = setupSelecting();
    state = selectTile(state, "p1", "0,0");
    const view = getPlayerView(state, "p1");
    expect(view.self.selectedTile).toBe("0,0");
  });

  it("hides other players' tiles before reveal", () => {
    let state = setupSelecting();
    state = selectTile(state, "p1", "0,0");
    state = selectTile(state, "p2", "1,0");
    const view = getPlayerView(state, "p1");
    for (const other of view.others) {
      expect(other.selectedTile).toBeNull();
    }
  });

  it("reveals other players' tiles in reveal phase", () => {
    const state = setupReveal();
    const view = getPlayerView(state, "p1");
    const bob = view.others.find((o) => o.id === "p2");
    expect(bob?.selectedTile).toBe("1,0");
  });

  it("shows words in real time during selecting", () => {
    let state = setupSelecting();
    state = selectWords(state, "p1", ["batman"]);
    state = selectWords(state, "p2", ["maraca"]);
    const view = getPlayerView(state, "p1");
    const bob = view.others.find((o) => o.id === "p2");
    expect(bob?.selectedWords).toEqual(["maraca"]);
  });
});

describe("scoreRound", () => {
  it("gives 1 point for unique tiles, 0 for collisions", () => {
    const state = setupReveal();
    const result = scoreRound(state);
    expect(result.collisions).toEqual([]);
    expect(result.scores["p1"]).toBe(1);
    expect(result.scores["p2"]).toBe(1);
    expect(result.scores["p3"]).toBe(1);
  });

  it("detects collisions", () => {
    let state = setupSelecting();
    state = selectTile(state, "p1", "0,0");
    state = selectTile(state, "p2", "0,0"); // same tile as p1
    state = selectTile(state, "p3", "1,0");
    state = lockIn(state, "p1");
    state = lockIn(state, "p2");
    state = lockIn(state, "p3");
    state = revealRound(state);
    const result = scoreRound(state);
    expect(result.collisions).toContain("0,0");
    expect(result.scores["p1"]).toBe(0);
    expect(result.scores["p2"]).toBe(0);
    expect(result.scores["p3"]).toBe(1);
  });

  it("throws in wrong phase", () => {
    const state = setupSelecting();
    expect(() => scoreRound(state)).toThrow();
  });
});

describe("kick voting", () => {
  it("initiates a kick vote", () => {
    const state = initiateKickVote(setupSelecting(), "p1", "p2");
    expect(state.activeKickVote).not.toBeNull();
    expect(state.activeKickVote!.targetId).toBe("p2");
    expect(state.activeKickVote!.votes).toEqual(["p1"]);
  });

  it("throws if kicking yourself", () => {
    expect(() => initiateKickVote(setupSelecting(), "p1", "p1")).toThrow("yourself");
  });

  it("throws if a vote is already in progress", () => {
    let state = initiateKickVote(setupSelecting(), "p1", "p2");
    expect(() => initiateKickVote(state, "p3", "p2")).toThrow("already in progress");
  });

  it("throws if not enough players", () => {
    let state = createGame("g1", TEST_CONFIG, TEST_TILES);
    state = addPlayer(state, "p1", "Alice");
    state = addPlayer(state, "p2", "Bob");
    expect(() => initiateKickVote(state, "p1", "p2")).toThrow("Not enough players");
  });

  it("casts a vote", () => {
    let state = initiateKickVote(setupSelecting(), "p1", "p2");
    state = castKickVote(state, "p3");
    expect(state.activeKickVote!.votes).toEqual(["p1", "p3"]);
  });

  it("throws if target votes", () => {
    let state = initiateKickVote(setupSelecting(), "p1", "p2");
    expect(() => castKickVote(state, "p2")).toThrow("own kick");
  });

  it("throws if already voted", () => {
    let state = initiateKickVote(setupSelecting(), "p1", "p2");
    expect(() => castKickVote(state, "p1")).toThrow("Already voted");
  });

  it("detects unanimous vote", () => {
    let state = initiateKickVote(setupSelecting(), "p1", "p2");
    expect(isKickVoteUnanimous(state)).toBe(false);
    state = castKickVote(state, "p3");
    expect(isKickVoteUnanimous(state)).toBe(true);
  });

  it("executes kick and removes player", () => {
    let state = initiateKickVote(setupSelecting(), "p1", "p2");
    state = castKickVote(state, "p3");
    state = executeKick(state);
    expect(state.players["p2"]).toBeUndefined();
    expect(state.activeKickVote).toBeNull();
    expect(Object.keys(state.players)).toHaveLength(2);
  });

  it("cancels a kick vote", () => {
    let state = initiateKickVote(setupSelecting(), "p1", "p2");
    state = cancelKickVote(state);
    expect(state.activeKickVote).toBeNull();
  });

  it("includes kick vote in player view", () => {
    let state = initiateKickVote(setupSelecting(), "p1", "p2");
    const view1 = getPlayerView(state, "p1");
    expect(view1.activeKickVote).not.toBeNull();
    expect(view1.activeKickVote!.targetName).toBe("Bob");
    expect(view1.activeKickVote!.selfHasVoted).toBe(true);
    expect(view1.activeKickVote!.votesCast).toBe(1);
    expect(view1.activeKickVote!.votesNeeded).toBe(2);

    const view3 = getPlayerView(state, "p3");
    expect(view3.activeKickVote!.selfHasVoted).toBe(false);
  });

  it("kick unblocks allLockedIn when remaining players are locked", () => {
    let state = setupSelecting();
    state = lockIn(state, "p1");
    state = lockIn(state, "p3");
    // p2 not locked in; kick p2
    state = initiateKickVote(state, "p1", "p2");
    state = castKickVote(state, "p3");
    state = executeKick(state);
    expect(allLockedIn(state)).toBe(true);
  });
});
