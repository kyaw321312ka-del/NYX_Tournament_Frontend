import { useEffect, useState, useRef } from "react";
import {
  CheckCircleRounded,
  EmojiEventsRounded,
  AccountTreeRounded,
  CloseRounded,
  KeyboardArrowDownRounded,
} from "@mui/icons-material";
import { getPublicCategoryDraw } from "../api/matchesApi";
import { getTournaments } from "../../tournaments/api/tournamentApi";

const PUBLIC_BRACKET_COLUMN_WIDTH = 250;
const PUBLIC_BRACKET_COLUMN_GAP = 32;
const PUBLIC_BRACKET_TRACK_WIDTH =
  PUBLIC_BRACKET_COLUMN_WIDTH + PUBLIC_BRACKET_COLUMN_GAP;
const PUBLIC_BRACKET_MATCH_HEIGHT = 108;
const PUBLIC_BRACKET_BASE_GAP = 12;
const PUBLIC_BRACKET_BASE_PITCH =
  PUBLIC_BRACKET_MATCH_HEIGHT + PUBLIC_BRACKET_BASE_GAP;
const publicBracketControlStyle = {
  width: "32px",
  height: "32px",
  border: "1px solid #cbd5e1",
  borderRadius: "7px",
  backgroundColor: "#ffffff",
  color: "#334155",
  fontSize: "16px",
  cursor: "pointer",
};

const tournamentDatabase = {
  "Mandalay Open Cup 2026": {
    desc: "The Mandalay Open Cup 2026 is an official Tier 1 major operating under direct knockout single elimination. All matches are conducted in best-of-3 sets using the 21-point rally scoring system.",
    live: [
      {
        id: "moc-live-1",
        court: "COURT 1",
        tournament: "Mandalay Open Cup",
        category: "MS",
        categoryFull: "Men's Singles",
        round: "Quarter-final",
        setLabel: "SET 3",
        players: [
          {
            name: "Min Thant",
            region: "YGN",
            seed: "#1",
            scores: [21, 18],
            current: 14,
          },
          {
            name: "Zarni Tun",
            region: "MDY",
            seed: "#4",
            scores: [18, 21],
            current: 12,
          },
        ],
      },
      {
        id: "moc-live-2",
        court: "COURT 2",
        tournament: "Mandalay Open Cup",
        category: "MS",
        categoryFull: "Men's Singles",
        round: "Semi-final",
        setLabel: "SET 2",
        players: [
          {
            name: "Phone Pyae",
            region: "YGN",
            seed: "#2",
            scores: [21],
            current: 19,
          },
          {
            name: "Thura Zaw",
            region: "MDY",
            seed: "#3",
            scores: [17],
            current: 16,
          },
        ],
      },
    ],
    schedule: [
      {
        id: "moc-up-1",
        time: "02:30 PM MMT",
        court: "Court 2",
        tournament: "Mandalay Open Cup",
        category: "MEN'S SINGLES (MS) · SEMI-FINAL",
        teamA: "Aung Myo",
        teamACode: "YGN",
        teamB: "Zaw Lin",
        teamBCode: "SHN",
        estimate: "Scheduled (Est. 45 min)",
      },
      {
        id: "moc-up-2",
        time: "04:00 PM MMT",
        court: "Court 1",
        tournament: "Mandalay Open Cup",
        category: "MEN'S SINGLES (MS) · FINAL",
        teamA: "Winner SF 1",
        teamACode: "TBD",
        teamB: "Winner SF 2",
        teamBCode: "TBD",
        estimate: "Scheduled",
      },
    ],
    finished: [
      {
        id: "moc-fin-1",
        tournament: "Mandalay Open Cup",
        court: "Court 3",
        time: "Finished (11:45 AM)",
        category: "Men's Singles",
        winner: "Aung Myo",
        winnerCode: "YGN",
        runnerUp: "Zaw Lin",
        runnerUpCode: "SHN",
        scores: [
          [21, 21],
          [16, 14],
        ],
        matchId: "#MOC-2408",
      },
      {
        id: "moc-fin-2",
        tournament: "Mandalay Open Cup",
        court: "Court 1",
        time: "Finished (10:00 AM)",
        category: "Men's Singles",
        winner: "Min Thant",
        winnerCode: "YGN",
        runnerUp: "Kyaw Swar",
        runnerUpCode: "MDY",
        scores: [
          [21, 19, 21],
          [18, 21, 14],
        ],
        matchId: "#MOC-2405",
      },
    ],
  },
  "Yangon Masters 2026": {
    desc: "The Yangon Masters 2026 brings together elite regional champions in a high-intensity indoor tournament format across singles and doubles divisions.",
    live: [
      {
        id: "ym-live-1",
        court: "COURT 1",
        tournament: "Yangon Masters",
        category: "MS",
        categoryFull: "Men's Singles",
        round: "Quarter-final",
        setLabel: "SET 2",
        players: [
          {
            name: "Hein Htet",
            region: "MDY",
            seed: "#1",
            scores: [21],
            current: 18,
          },
          {
            name: "Sai Lu",
            region: "YGN",
            seed: "#5",
            scores: [14],
            current: 15,
          },
        ],
      },
    ],
    schedule: [
      {
        id: "ym-up-1",
        time: "01:00 PM MMT",
        court: "Court 1",
        tournament: "Yangon Masters",
        category: "MEN'S SINGLES (MS) · QUARTER-FINAL",
        teamA: "Lin Htut",
        teamACode: "BGO",
        teamB: "Myo Min",
        teamBCode: "MDY",
        estimate: "Scheduled",
      },
    ],
    finished: [
      {
        id: "ym-fin-1",
        tournament: "Yangon Masters",
        court: "Court 2",
        time: "Finished (10:15 AM)",
        category: "Men's Singles",
        winner: "Hein Htet",
        winnerCode: "MDY",
        runnerUp: "Sai Lu",
        runnerUpCode: "YGN",
        scores: [
          [21, 19, 21],
          [18, 21, 15],
        ],
        matchId: "#YGM-1092",
      },
    ],
  },
  "Myanmar National Series 2026": {
    desc: "The premier nationwide ranking circuit determining national team qualifications and championship standings for professional athletes.",
    live: [
      {
        id: "mns-live-1",
        court: "COURT 3",
        tournament: "Myanmar National Series",
        category: "MS",
        categoryFull: "Men's Singles",
        round: "Finals",
        setLabel: "SET 1",
        players: [
          {
            name: "Phone Pyae",
            region: "YGN",
            seed: "#1",
            scores: [],
            current: 11,
          },
          {
            name: "Thura Zaw",
            region: "MDY",
            seed: "#2",
            scores: [],
            current: 9,
          },
        ],
      },
    ],
    schedule: [
      {
        id: "mns-up-1",
        time: "02:00 PM MMT",
        court: "Court 1",
        tournament: "Myanmar National Series",
        category: "MEN'S SINGLES (MS) · FINAL",
        teamA: "Phone Pyae",
        teamACode: "YGN",
        teamB: "Min Thant",
        teamBCode: "YGN",
        estimate: "Scheduled",
      },
    ],
    finished: [
      {
        id: "mns-fin-1",
        tournament: "Myanmar National Series",
        court: "Court 1",
        time: "Finished (09:30 AM)",
        category: "Men's Singles",
        winner: "Phone Pyae",
        winnerCode: "YGN",
        runnerUp: "Kyaw Swar",
        runnerUpCode: "MDY",
        scores: [
          [21, 21],
          [14, 18],
        ],
        matchId: "#MNS-001",
      },
    ],
  },
};

const EMPTY_TOURNAMENT_DATA = {
  desc: "",
};

function getCategoryCode(category) {
  return String(category.categoryCode || category.code || category.id || "");
}

function getCategoryName(category) {
  return String(category.categoryName || category.name || getCategoryCode(category));
}

function getPublicMatchParticipant(match, side) {
  const participant =
    match?.participants?.[side - 1] ??
    match?.slots?.[side - 1]?.participant ??
    match?.[`participant${side}`] ??
    match?.[`player${side}`] ??
    match?.[`registration${side}`] ??
    null;
  if (typeof participant === "string") return participant;
  if (typeof participant === "number") return `Registration #${participant}`;
  if (participant && typeof participant === "object") {
    const members = participant.members || participant.registration?.members;
    const memberNames = Array.isArray(members)
      ? members
          .map((member) =>
            typeof member === "string"
              ? member
              : member?.name || member?.playerName || member?.athleteName,
          )
          .filter(Boolean)
          .join(" / ")
      : "";
    return (
      participant.name ||
      participant.athleteName ||
      participant.playerName ||
      participant.registrationName ||
      participant.teamName ||
      participant.player?.name ||
      participant.user?.name ||
      participant.registration?.name ||
      memberNames ||
      "Awaiting player"
    );
  }
  return (
    match?.[`participant${side}Name`] ||
    match?.[`player${side}Name`] ||
    "Awaiting player"
  );
}

function getPublicMatchParticipantId(match, side) {
  const participant =
    match?.participants?.[side - 1] ??
    match?.slots?.[side - 1]?.participant ??
    match?.[`participant${side}`] ??
    match?.[`player${side}`] ??
    match?.[`registration${side}`] ??
    null;
  if (participant && typeof participant === "object") {
    return (
      participant.registrationId ??
      participant.registration?.id ??
      participant.registration?.registrationId ??
      participant.id ??
      null
    );
  }
  return (
    match?.[`participant${side}RegistrationId`] ??
    match?.[`registration${side}Id`] ??
    match?.[`participant${side}Id`] ??
    null
  );
}

function getPublicMatchWinnerSide(match) {
  const winnerValue =
    match?.winnerSide ??
    match?.winnerParticipant ??
    match?.winnerPosition ??
    match?.result?.winnerSide;
  const normalizedWinner = String(winnerValue ?? "").toLowerCase();
  if (["1", "participant1", "player1", "a"].includes(normalizedWinner)) {
    return 1;
  }
  if (["2", "participant2", "player2", "b"].includes(normalizedWinner)) {
    return 2;
  }

  const winner =
    match?.winnerName ||
    match?.winner?.name ||
    match?.winner?.athleteName ||
    match?.winner?.player?.name ||
    match?.winner?.user?.name ||
    (typeof match?.winner === "string" ? match.winner : "");
  if (winner) {
    for (const side of [1, 2]) {
      if (getPublicMatchParticipant(match, side) === winner) return side;
    }
  }
  const winnerId =
    match?.winnerRegistrationId ??
    match?.winnerId ??
    match?.winner?.registrationId ??
    match?.winner?.registration?.id ??
    match?.winner?.id;
  if (winnerId != null) {
    for (const side of [1, 2]) {
      if (
        String(getPublicMatchParticipantId(match, side)) === String(winnerId)
      ) {
        return side;
      }
    }
  }
  return null;
}

function getPublicMatchScores(match) {
  const games = Array.isArray(match?.result?.games)
    ? match.result.games
    : Array.isArray(match?.games)
      ? match.games
      : Array.isArray(match?.scores)
        ? match.scores
        : [];
  return games
    .map((game, index) => {
      const score1 =
        game?.participant1Score ??
        game?.player1Score ??
        game?.score1 ??
        game?.scores?.[0];
      const score2 =
        game?.participant2Score ??
        game?.player2Score ??
        game?.score2 ??
        game?.scores?.[1];
      if (score1 == null && score2 == null) return null;
      return `G${game?.gameNumber ?? game?.setNumber ?? index + 1} ${score1 ?? "–"}-${score2 ?? "–"}`;
    })
    .filter(Boolean);
}

function getPublicRoundName(round, index) {
  return (
    round?.name ||
    round?.roundName ||
    round?.title ||
    (round?.roundNumber != null
      ? `Round ${round.roundNumber}`
      : `Round ${index + 1}`)
  );
}

function getPublicBracketMatchGap(roundIndex) {
  return Math.max(
    PUBLIC_BRACKET_BASE_GAP,
    PUBLIC_BRACKET_BASE_PITCH * 2 ** roundIndex -
      PUBLIC_BRACKET_MATCH_HEIGHT,
  );
}

function getPublicBracketRoundPadding(roundIndex) {
  return (
    (PUBLIC_BRACKET_BASE_PITCH / 2) * (2 ** roundIndex - 1)
  );
}

function BracketModal({ onClose, tournamentName, category }) {
  const [draw, setDraw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedRound, setSelectedRound] = useState("All");
  const [bracketZoom, setBracketZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadDraw() {
      setLoading(true);
      setLoadError("");
      setDraw(null);
      try {
        const result = await getPublicCategoryDraw(category.id);
        if (!cancelled) setDraw(result);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Unable to load the draw.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDraw();
    return () => {
      cancelled = true;
    };
  }, [category.id]);

  const rounds = Array.isArray(draw?.rounds) ? draw.rounds : [];
  const roundEntries = rounds
    .map((round, index) => ({
      index,
      name: getPublicRoundName(round, index),
      matches: Array.isArray(round.matches) ? round.matches : [],
    }))
    .filter((round) => round.matches.length > 0);
  const hasMatches = roundEntries.length > 0;
  const visibleRounds =
    selectedRound === "All"
      ? roundEntries
      : roundEntries.filter((round) => `round-${round.index}` === selectedRound);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        className="bracket-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bracket-title"
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">BRACKET ROUNDS</span>
            <h2 className="modal-title" id="bracket-title">
              {tournamentName}
            </h2>
            <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "13px" }}>
              {getCategoryCode(category)} · {getCategoryName(category)}
            </p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close bracket"
          >
            <CloseRounded />
          </button>
        </div>

        <div
          style={{
            overflow: "auto",
            maxHeight: "calc(80vh - 80px)",
            maxWidth: "100%",
            padding: "4px",
            boxSizing: "border-box",
          }}
        >
          {!loading && !loadError && hasMatches && (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  margin: "4px 4px 10px",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: "0 0 4px",
                      color: "#0f172a",
                      fontSize: "16px",
                    }}
                  >
                    Bracket rounds
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    Bracket and match data loaded from the selected draw.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <button
                    type="button"
                    aria-label="Zoom out"
                    onClick={() =>
                      setBracketZoom((zoom) =>
                        Math.max(0.75, Number((zoom - 0.1).toFixed(2))),
                      )
                    }
                    style={publicBracketControlStyle}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    aria-label="Reset bracket zoom"
                    onClick={() => setBracketZoom(1)}
                    style={{
                      ...publicBracketControlStyle,
                      width: "auto",
                      padding: "0 10px",
                    }}
                  >
                    {Math.round(bracketZoom * 100)}%
                  </button>
                  <button
                    type="button"
                    aria-label="Zoom in"
                    onClick={() =>
                      setBracketZoom((zoom) =>
                        Math.min(1.25, Number((zoom + 0.1).toFixed(2))),
                      )
                    }
                    style={publicBracketControlStyle}
                  >
                    +
                  </button>
                </div>
              </div>
              <div
                role="group"
                aria-label="Filter bracket rounds"
                style={{
                  display: "flex",
                  gap: "7px",
                  overflowX: "auto",
                  padding: "2px 4px 8px",
                }}
              >
                {[
                  { value: "All", label: "All" },
                  ...roundEntries.map((round) => ({
                    value: `round-${round.index}`,
                    label: round.name,
                  })),
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedRound(value)}
                    style={{
                      flex: "0 0 auto",
                      padding: "7px 12px",
                      border: `1px solid ${
                        selectedRound === value ? "#ef3340" : "#cbd5e1"
                      }`,
                      borderRadius: "999px",
                      backgroundColor:
                        selectedRound === value ? "#ef3340" : "#ffffff",
                      color: selectedRound === value ? "#ffffff" : "#475569",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
          {loading ? (
            <p role="status" style={{ color: "#64748b" }}>
              Loading published bracket…
            </p>
          ) : loadError ? (
            <p role="alert" style={{ color: "#b91c1c" }}>
              Unable to load bracket: {loadError}
            </p>
          ) : !draw || !hasMatches ? (
            <p role="status" style={{ color: "#64748b" }}>
              No published bracket is available for this category yet.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 0,
                minWidth: `${visibleRounds.length * PUBLIC_BRACKET_TRACK_WIDTH}px`,
                padding: "28px 8px 12px",
                position: "relative",
                transform: `scale(${bracketZoom})`,
                transformOrigin: "top left",
                width: `${100 / bracketZoom}%`,
              }}
            >
              {selectedRound === "All" && visibleRounds.length > 1 && (
                <svg
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    overflow: "visible",
                    pointerEvents: "none",
                  }}
                >
                  {visibleRounds.map((round, roundIndex) => {
                    if (roundIndex >= visibleRounds.length - 1) return null;
                    const roundMatches = round.matches;
                    const nextRoundMatches =
                      visibleRounds[roundIndex + 1].matches;
                    const cardPitch =
                      PUBLIC_BRACKET_MATCH_HEIGHT +
                      getPublicBracketMatchGap(roundIndex);
                    const nextCardPitch =
                      PUBLIC_BRACKET_MATCH_HEIGHT +
                      getPublicBracketMatchGap(roundIndex + 1);
                    const roundPadding =
                      getPublicBracketRoundPadding(roundIndex);
                    const nextRoundPadding =
                      getPublicBracketRoundPadding(roundIndex + 1);
                    const sourceX =
                      8 +
                      roundIndex * PUBLIC_BRACKET_TRACK_WIDTH +
                      PUBLIC_BRACKET_COLUMN_WIDTH;
                    const targetX =
                      8 + (roundIndex + 1) * PUBLIC_BRACKET_TRACK_WIDTH;
                    const joinX = sourceX + 9;

                    return roundMatches
                      .filter((_, index) => index % 2 === 0)
                      .map((_, pairIndex) => {
                        const sourceIndex = pairIndex * 2;
                        const hasPairedMatch =
                          roundMatches[sourceIndex + 1] != null;
                        const firstY =
                          8 +
                          roundPadding +
                          sourceIndex * cardPitch +
                          PUBLIC_BRACKET_MATCH_HEIGHT / 2;
                        const secondY =
                          8 +
                          roundPadding +
                          (sourceIndex + 1) * cardPitch +
                          PUBLIC_BRACKET_MATCH_HEIGHT / 2;
                        const targetY =
                          8 +
                          nextRoundPadding +
                          pairIndex * nextCardPitch +
                          PUBLIC_BRACKET_MATCH_HEIGHT / 2;
                        const topY = Math.min(firstY, secondY);
                        const bottomY = hasPairedMatch ? secondY : firstY;
                        const targetYWithinNext =
                          pairIndex < nextRoundMatches.length
                            ? targetY
                            : (topY + bottomY) / 2;

                        return (
                          <g
                            key={`${roundIndex}-connector-${pairIndex}`}
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="1.5"
                            strokeLinecap="square"
                            strokeLinejoin="round"
                          >
                            <path d={`M ${sourceX} ${firstY} H ${joinX}`} />
                            {hasPairedMatch && (
                              <>
                                <path
                                  d={`M ${sourceX} ${secondY} H ${joinX}`}
                                />
                                <path
                                  d={`M ${joinX} ${topY} V ${bottomY}`}
                                />
                              </>
                            )}
                            <path
                              d={`M ${joinX} ${targetYWithinNext} H ${targetX}`}
                            />
                          </g>
                        );
                      });
                  })}
                </svg>
              )}
              {visibleRounds.map((round, roundIndex) => {
                const matches = round.matches;
                const roundName = round.name;
                return (
                  <div
                    key={`${roundName}-${round.index}`}
                    style={{
                      display: "flex",
                      flex: `0 0 ${PUBLIC_BRACKET_TRACK_WIDTH}px`,
                      width: `${PUBLIC_BRACKET_TRACK_WIDTH}px`,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: `${PUBLIC_BRACKET_COLUMN_WIDTH}px`,
                        display: "flex",
                        flexDirection: "column",
                        gap: `${getPublicBracketMatchGap(roundIndex)}px`,
                        paddingTop: `${getPublicBracketRoundPadding(roundIndex)}px`,
                      }}
                    >
                      <h3
                        style={{
                          height: "18px",
                          margin: 0,
                          color: "#475569",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          position: "absolute",
                          transform: "translateY(-22px)",
                        }}
                      >
                        {roundName}
                      </h3>
                      {matches.map((match, matchIndex) => {
                        const winnerSide = getPublicMatchWinnerSide(match);
                        const scores = getPublicMatchScores(match);
                        const status = String(
                          match.status || match.matchStatus || "Scheduled",
                        ).replace(/[_-]+/g, " ");
                        const matchId =
                          match.id ??
                          match.matchId ??
                          `${roundIndex}-${matchIndex}`;

                        return (
                          <article
                            key={matchId}
                            style={{
                              height: `${PUBLIC_BRACKET_MATCH_HEIGHT}px`,
                              flex: `0 0 ${PUBLIC_BRACKET_MATCH_HEIGHT}px`,
                              boxSizing: "border-box",
                              padding: "6px",
                              border: "1px solid #dbe3eb",
                              borderRadius: "8px",
                              backgroundColor: "#ffffff",
                              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
                              position: "relative",
                              zIndex: 1,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "8px",
                                height: "14px",
                                marginBottom: "4px",
                                color: "#64748b",
                                fontSize: "9px",
                                fontWeight: 700,
                                textTransform: "capitalize",
                              }}
                            >
                              <span>Match {matchIndex + 1}</span>
                              <span>{status}</span>
                            </div>
                            {[1, 2].map((side) => (
                              <div
                                key={side}
                                style={{
                                  height: "27px",
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "0 7px",
                                  marginTop: side === 2 ? "3px" : 0,
                                  borderRadius: "4px",
                                  backgroundColor:
                                    winnerSide === side ? "#86efac" : "#536b7e",
                                  color:
                                    winnerSide === side ? "#14532d" : "#ffffff",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  overflow: "hidden",
                                }}
                              >
                                <span
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {winnerSide === side ? "✓ " : ""}
                                  {getPublicMatchParticipant(match, side)}
                                </span>
                              </div>
                            ))}
                            {scores.length > 0 && (
                              <div
                                style={{
                                  height: "14px",
                                  overflow: "hidden",
                                  marginTop: "4px",
                                  color: "#475569",
                                  fontSize: "9px",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {scores.join(" · ")}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function WebMatches() {
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [availableTournaments, setAvailableTournaments] = useState([]);
  const [tournamentLoadError, setTournamentLoadError] = useState("");
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [showBracket, setShowBracket] = useState(false);
  const [showTourneyDropdown, setShowTourneyDropdown] = useState(false);
  const [notice, setNotice] = useState("");

  const tourneyDropdownRef = useRef(null);

  const selectedTournament = availableTournaments.find(
    (tournament) => String(tournament.id) === selectedTournamentId,
  );
  const categories = Array.isArray(selectedTournament?.categories)
    ? selectedTournament.categories.filter(
        (category) => getCategoryCode(category) && getCategoryName(category),
      )
    : [];
  const selectedCategory = categories.find(
    (category) => getCategoryCode(category) === activeCategory,
  );
  const tournaments = availableTournaments;

  useEffect(() => {
    let cancelled = false;

    async function loadTournaments() {
      setLoadingTournaments(true);
      setTournamentLoadError("");
      try {
        const result = await getTournaments({ page: 1, pageSize: 100 });
        if (cancelled) return;
        const publishedTournaments = result.tournaments.filter(
          (tournament) =>
            String(tournament.publicationStatus || "").toLowerCase() ===
            "published",
        );
        setAvailableTournaments(publishedTournaments);
        const firstTournament = publishedTournaments[0];
        setSelectedTournamentId(String(firstTournament?.id ?? ""));
        const firstCategory = firstTournament?.categories?.[0];
        setActiveCategory(firstCategory ? getCategoryCode(firstCategory) : "");
      } catch (error) {
        if (!cancelled) {
          setTournamentLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load tournaments.",
          );
        }
      } finally {
        if (!cancelled) setLoadingTournaments(false);
      }
    }

    loadTournaments();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        tourneyDropdownRef.current &&
        !tourneyDropdownRef.current.contains(event.target)
      ) {
        setShowTourneyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => {
      setNotice("");
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedTournamentName = selectedTournament?.title || "";
  const currentData =
    tournamentDatabase[selectedTournamentName] || EMPTY_TOURNAMENT_DATA;

  return (
    <>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap");

        .tournament-page {
          min-height: 100vh;
          padding: 24px 16px 48px;
          background: #f7f8fa;
          color: #172033;
          font-family: "DM Sans", "Manrope", sans-serif;
          font-size: 15px;
          box-sizing: border-box;
          width: 100%;
        }

        .tournament-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          width: 100%;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
          flex-wrap: wrap;
          width: 100%;
          justify-content: flex-end;
        }

        .select-date-button {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 16px;
          border: 1px solid #eef0f3;
          border-radius: 12px;
          background: #fff;
          color: #354052;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 3px 12px rgba(20, 30, 50, 0.03);
          transition: all 0.2s ease;
          flex: 1;
          justify-content: center;
        }

        .select-date-button:hover,
        .control-active {
          border-color: #ae1236;
          color: #ae1236;
        }

        .date-picker-wrap, .tourney-dropdown-wrap {
          position: relative;
          flex: 1;
          min-width: 180px;
        }

        /* Fixed Mobile Popover Overflow Issue */
        .date-popover {
          position: absolute;
          z-index: 100;
          top: calc(100% + 8px);
          left: 0;
          right: auto;
          width: min(280px, 85vw);
          padding: 16px;
          border: 1px solid #eef0f3;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 15px 40px rgba(20, 30, 50, 0.15);
          box-sizing: border-box;
        }

        .date-label {
          display: block;
          margin-bottom: 8px;
          color: #596170;
          font-size: 12px;
          font-weight: 800;
        }

        .date-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #dfe3e9;
          border-radius: 8px;
          color: #172033;
          background: #fff;
          font: inherit;
          font-size: 14px;
          box-sizing: border-box;
        }

        .date-apply {
          width: 100%;
          margin-top: 12px;
          padding: 10px;
          border: 0;
          border-radius: 8px;
          color: #fff;
          background: #ae1236;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .tournament-select-custom {
          width: 100%;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 14px;
          border: 1px solid #eef0f3;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 3px 12px rgba(20, 30, 50, 0.03);
          color: #ae1236;
          cursor: pointer;
          font-weight: 700;
          font-size: 13.5px;
          box-sizing: border-box;
        }

        .tournament-select-custom span {
          color: #172033;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tourney-menu {
          position: absolute;
          z-index: 100;
          top: calc(100% + 8px);
          left: 0;
          right: auto;
          width: min(300px, 90vw);
          padding: 8px;
          border: 1px solid #eef0f3;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 15px 40px rgba(20, 30, 50, 0.15);
          box-sizing: border-box;
        }

        .tourney-option {
          width: 100%;
          padding: 10px 12px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #354052;
          text-align: left;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tourney-option:hover, .tourney-option-active {
          background: #fde9ee;
          color: #ae1236;
        }

        .category-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          overflow-x: auto;
          padding-bottom: 4px;
          -webkit-overflow-scrolling: touch;
        }

        .category-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex: 0 0 auto;
          min-height: 40px;
          padding: 0 14px;
          border: 1px solid #eef0f3;
          border-radius: 10px;
          color: #596170;
          background: #fff;
          box-shadow: 0 3px 12px rgba(20, 30, 50, 0.03);
          cursor: pointer;
          font: inherit;
          font-size: 12.5px;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .category-tab:hover {
          border-color: #ae1236;
          color: #ae1236;
        }

        .category-tab-active {
          border-color: #ae1236;
          color: #fff;
          background: #ae1236;
          box-shadow: 0 4px 14px rgba(174, 18, 54, 0.25);
        }

        .tournament-info {
          display: flex;
          position: relative;
          margin-bottom: 24px;
          padding: 20px;
          border: 1px solid #eef0f3;
          border-left: 5px solid #ae1236;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 4px 16px rgba(20, 30, 50, 0.04);
        }

        .info-copy {
          flex: 1;
          min-width: 0;
        }

        .info-heading-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .tournament-title {
          margin: 0;
          color: #172033;
          font-family: "Manrope", sans-serif;
          font-size: 20px;
          font-weight: 800;
        }

        .bracket-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 38px;
          padding: 0 14px;
          border: 1px solid #dfe3e9;
          border-radius: 10px;
          color: #354052;
          background: #f8f9fb;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .bracket-button:hover {
          color: #ae1236;
          border-color: #ae1236;
          background: #fff;
        }

        .tournament-description {
          max-width: 1000px;
          margin: 10px 0 0;
          color: #596170;
          font-size: 13.5px;
          line-height: 1.6;
        }

        .section-block {
          margin-bottom: 24px;
        }

        .section-heading-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .section-heading {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          color: #172033;
          font-size: 16px;
          font-weight: 800;
        }

        .live-pulse {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #ae1236;
          box-shadow: 0 0 0 4px rgba(174, 18, 54, 0.15);
          animation: pulse-ring 1.8s infinite;
        }

        .live-status,
        .upcoming-status,
        .verified-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 30px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .live-status {
          color: #ae1236;
          background: #fde9ee;
        }

        .upcoming-status {
          color: #957027;
          background: #fff4d9;
        }

        .verified-status {
          color: #087b59;
          background: #e4f7ef;
        }

        .live-list,
        .schedule-list,
        .finished-list {
          display: grid;
          gap: 14px;
        }

        .live-card {
          position: relative;
          padding: 16px;
          border: 1px solid #eef0f3;
          border-left: 4px solid #ae1236;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 4px 14px rgba(20, 30, 50, 0.04);
        }

        .live-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .match-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .court-badge,
        .time-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 22px;
          padding: 0 8px;
          border-radius: 6px;
          color: #fff;
          background: #172033;
          font-size: 10.5px;
          font-weight: 800;
        }

        .match-meta-text {
          color: #596170;
          font-size: 12px;
          font-weight: 600;
        }

        .sync-button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 32px;
          padding: 0 12px;
          border: 1px solid #172033;
          border-radius: 8px;
          color: #fff;
          background: #172033;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .sync-button-active {
          background: #087b59;
          border-color: #087b59;
        }

        .live-score-panel {
          display: grid;
          grid-template-columns: minmax(140px, 1.4fr) 30px minmax(80px, 0.7fr) minmax(75px, 0.55fr);
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-radius: 10px;
          background: #f8f9fb;
        }

        .players-column {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .player-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .player-dot {
          color: #ae1236;
          font-size: 9px !important;
          flex-shrink: 0;
        }

        .player-name-wrap {
          display: flex;
          align-items: baseline;
          gap: 6px;
          flex-wrap: wrap;
          min-width: 0;
        }

        .player-name {
          color: #172033;
          font-size: 13.5px;
          font-weight: 800;
        }

        .player-sub {
          color: #727987;
          font-size: 10.5px;
          font-weight: 700;
          white-space: nowrap;
        }

        .racket-mark {
          display: flex;
          justify-content: center;
          color: #727987;
        }

        .past-sets {
          display: flex;
          justify-content: space-around;
        }

        .set-column {
          display: grid;
          justify-items: center;
          gap: 4px;
        }

        .set-heading {
          color: #727987;
          font-size: 10px;
          font-weight: 800;
        }

        .past-score {
          color: #354052;
          font-size: 13px;
          font-weight: 700;
        }

        .current-set {
          display: grid;
          justify-items: center;
          gap: 2px;
          padding: 8px;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 2px 8px rgba(20, 30, 50, 0.05);
        }

        .current-set-label {
          color: #ae1236;
          font-size: 9.5px;
          font-weight: 900;
        }

        .current-score {
          color: #172033;
          font-size: 18px;
          font-weight: 800;
        }

        .schedule-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
          border: 1px solid #eef0f3;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 4px 14px rgba(20, 30, 50, 0.04);
        }

        .schedule-main {
          flex: 1;
          min-width: 0;
        }

        .schedule-topline {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .schedule-location {
          color: #596170;
          font-size: 11.5px;
          font-weight: 700;
        }

        .schedule-status {
          margin-left: auto;
          padding: 3px 8px;
          border-radius: 6px;
          color: #596170;
          background: #f3f4f6;
          font-size: 10.5px;
          font-weight: 800;
        }

        .status-muted {
          color: #727987;
        }

        .schedule-category {
          margin-bottom: 6px;
          color: #ae1236;
          font-size: 11px;
          font-weight: 800;
        }

        .team-name {
          color: #172033;
          font-size: 14.5px;
          font-weight: 800;
        }

        .team-code {
          color: #727987;
          font-size: 11px;
          font-weight: 700;
        }

        .versus {
          margin: 3px 0;
          color: #727987;
          font-size: 11px;
          font-weight: 800;
        }

        .finished-card {
          padding: 16px;
          border: 1px solid #eef0f3;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 4px 14px rgba(20, 30, 50, 0.04);
        }

        .finished-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 6px;
        }

        .finished-meta,
        .match-id {
          color: #727987;
          font-size: 11.5px;
          font-weight: 700;
        }

        .finished-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .finished-players {
          display: grid;
          gap: 8px;
        }

        .finished-player {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .finished-player-name {
          font-size: 14.5px;
          font-weight: 800;
        }

        .winner-icon {
          color: #ae1236;
          font-size: 16px !important;
        }

        .winner-icon-placeholder {
          width: 16px;
        }

        .runner-player .finished-player-name {
          color: #727987;
          font-weight: 600;
        }

        .finished-scores {
          display: flex;
          gap: 14px;
        }

        .finished-set {
          display: grid;
          justify-items: center;
          gap: 3px;
        }

        .finished-score {
          color: #727987;
          font-size: 13px;
          font-weight: 600;
        }

        .winner-score {
          color: #172033;
          font-size: 16px;
          font-weight: 900;
        }

        .empty-state {
          padding: 24px;
          text-align: center;
          color: #727987;
          background: #fff;
          border-radius: 12px;
          border: 1px dashed #eef0f3;
          font-weight: 700;
          font-size: 13.5px;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          background: rgba(11, 18, 32, 0.6);
          backdrop-filter: blur(4px);
          box-sizing: border-box;
        }

        .bracket-modal {
          width: 100%;
          max-width: 850px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          padding: 20px;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          box-sizing: border-box;
          margin: auto;
        }

        .bracket-scroll-area {
          width: 100%;
          overflow-x: auto;
          overflow-y: auto;
          max-height: calc(85vh - 90px);
          padding-bottom: 10px;
          -webkit-overflow-scrolling: touch;
        }

        .bracket-grid {
          display: flex;
          gap: 16px;
          min-width: 720px;
          padding: 4px;
        }

        .bracket-round {
          flex: 1;
          display: grid;
          gap: 10px;
          padding: 12px;
          border: 1px solid #eef0f3;
          border-radius: 12px;
          background: #f8f9fb;
          min-width: 165px;
          box-sizing: border-box;
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-shrink: 0;
        }

        .eyebrow {
          color: #ae1236;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .modal-title {
          margin: 4px 0 0;
          color: #172033;
          font-size: 18px;
          font-weight: 800;
        }

        .icon-button {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border: 0;
          border-radius: 8px;
          background: #f1f3f6;
          color: #354052;
          cursor: pointer;
        }

        .bracket-scroll-area {
          overflow-x: auto;
          overflow-y: auto;
          max-height: calc(90vh - 100px);
          padding-bottom: 8px;
          -webkit-overflow-scrolling: touch;
        }

        .bracket-grid {
          display: flex;
          gap: 16px;
          min-width: 700px;
        }

        .bracket-round {
          flex: 1;
          display: grid;
          gap: 10px;
          padding: 12px;
          border: 1px solid #eef0f3;
          border-radius: 12px;
          background: #f8f9fb;
          min-width: 170px;
        }

        .bracket-round-title {
          color: #727987;
          font-size: 10px;
          font-weight: 900;
        }

        .bracket-team,
        .bracket-champion {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border: 1px solid #eef0f3;
          border-radius: 8px;
          background: #fff;
          font-size: 12.5px;
          font-weight: 700;
        }

        .bracket-team b {
          color: #ae1236;
        }

        .bracket-pending {
          color: #727987;
          border-style: dashed;
        }

        .bracket-champion {
          color: #b8860b;
          background: #fffdf4;
          border-color: #faebd7;
        }

        .toast-message {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 10px;
          color: #087b59;
          background: #e4f7ef;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          font-size: 12.5px;
          font-weight: 700;
        }

        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 3px rgba(174, 18, 54, 0.1); }
          50% { box-shadow: 0 0 0 7px rgba(174, 18, 54, 0.2); }
        }

        @media (max-width: 768px) {
          .live-score-panel { grid-template-columns: 1fr; gap: 10px; }
          .schedule-card { flex-direction: column; align-items: flex-start; }
          .tournament-page { padding: 16px 5px; }
          .topbar { flex-direction: column; align-items: stretch; }
          .topbar-actions { width: 100%; justify-content: space-between; }
        }
      `}</style>

      <main className="tournament-page">
        <div className="tournament-container">
          <header className="topbar">
            <div className="topbar-actions">
              <div className="tourney-dropdown-wrap" ref={tourneyDropdownRef}>
                <div
                  className={`tournament-select-custom ${showTourneyDropdown ? "control-active" : ""}`}
                  onClick={() => {
                    setShowTourneyDropdown((v) => !v);
                  }}
                >
                  <span>
                    <EmojiEventsRounded
                      style={{ fontSize: 17, color: "#ae1236" }}
                    />
                    {selectedTournamentName || "Select tournament"}
                  </span>
                  <KeyboardArrowDownRounded />
                </div>

                {showTourneyDropdown && (
                  <div className="tourney-menu">
                    {tournaments.map((tournament) => (
                      <button
                        key={tournament.id}
                        className={`tourney-option ${selectedTournamentId === String(tournament.id) ? "tourney-option-active" : ""}`}
                        onClick={() => {
                          setSelectedTournamentId(String(tournament.id));
                          const firstCategory = tournament.categories?.[0];
                          setActiveCategory(
                            firstCategory ? getCategoryCode(firstCategory) : "",
                          );
                          setShowTourneyDropdown(false);
                          setNotice(`Switched to ${tournament.title}`);
                        }}
                      >
                        {tournament.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          <nav className="category-tabs" aria-label="Match category">
            {categories.map((category) => (
              <button
                key={getCategoryCode(category)}
                className={`category-tab ${activeCategory === getCategoryCode(category) ? "category-tab-active" : ""}`}
                onClick={() => {
                  setActiveCategory(getCategoryCode(category));
                  setNotice(`Filtered by ${getCategoryName(category)}`);
                }}
              >
                <span className="category-code">{getCategoryCode(category)}</span>
                <span className="category-full">{getCategoryName(category)}</span>
              </button>
            ))}
          </nav>

          {tournamentLoadError && (
            <div className="empty-state" role="alert">
              Unable to load tournaments: {tournamentLoadError}
            </div>
          )}
          {!loadingTournaments &&
            !tournamentLoadError &&
            availableTournaments.length === 0 && (
              <div className="empty-state" role="status">
                No published tournaments are available.
              </div>
            )}

          <section className="tournament-info">
            <div className="info-copy">
              <div className="info-heading-row">
                <h1 className="tournament-title">{selectedTournamentName}</h1>
                <button
                  className="bracket-button"
                  disabled={!selectedCategory || loadingTournaments}
                  onClick={() => setShowBracket(true)}
                  title={
                    selectedCategory
                      ? "View the published draw for this category"
                      : "Select a tournament category first"
                  }
                >
                  <AccountTreeRounded style={{ fontSize: 16 }} />
                  View Tournament Bracket Tree
                </button>
              </div>
              <p className="tournament-description">
                {currentData.desc || selectedTournament?.description || ""}
              </p>
            </div>
          </section>
        </div>

        {notice && (
          <div className="toast-message" role="status">
            <CheckCircleRounded />
            {notice}
          </div>
        )}

        {showBracket && selectedCategory && (
          <BracketModal
            onClose={() => setShowBracket(false)}
            tournamentName={selectedTournamentName}
            category={selectedCategory}
          />
        )}
      </main>
    </>
  );
}
