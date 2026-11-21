import { useEffect, useMemo, useState } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import {
  assignDrawPositions,
  createCategoryDraw,
  finalizeCategoryDraw,
  getCategoryDraw,
  getCategoryDraws,
  getCategoryRankingPointAwards,
  getEligibleRegistrations,
  publishCategoryDraw,
  updateMatchResult,
} from "../api/matchesApi";
import { getTournaments } from "../../tournaments/api/tournamentApi";

const cardStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "22px",
  marginBottom: "10px",
};

const buttonStyle = {
  border: "none",
  borderRadius: "8px",
  padding: "10px 14px",
  backgroundColor: "#0f172a",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "12px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: "7px",
  backgroundColor: "#ffffff",
  fontSize: "13px",
};

const BRACKET_COLUMN_WIDTH = 210;
const BRACKET_COLUMN_GAP = 32;
const BRACKET_TRACK_WIDTH =
  BRACKET_COLUMN_WIDTH + BRACKET_COLUMN_GAP;
const BRACKET_MATCH_HEIGHT = 52;
const BRACKET_MATCH_BASE_GAP = 8;
const BRACKET_MATCH_BASE_PITCH =
  BRACKET_MATCH_HEIGHT + BRACKET_MATCH_BASE_GAP;

function getBracketMatchGap(roundIndex) {
  return Math.max(
    BRACKET_MATCH_BASE_GAP,
    BRACKET_MATCH_BASE_PITCH * 2 ** roundIndex - BRACKET_MATCH_HEIGHT,
  );
}

function getBracketRoundPadding(roundIndex) {
  return (
    (BRACKET_MATCH_BASE_PITCH / 2) * (2 ** roundIndex - 1)
  );
}

function messageFrom(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

function unwrapDraw(data) {
  return data?.draw || data;
}

function getDrawId(draw) {
  return draw?.id ?? draw?.drawId ?? null;
}

function getRegistrationId(registration) {
  return (
    registration?.registrationId ??
    registration?.id ??
    registration?.registration?.id ??
    null
  );
}

function getMemberName(member) {
  if (typeof member === "string") return member;
  return (
    member?.name ||
    member?.athleteName ||
    member?.playerName ||
    member?.user?.name ||
    ""
  );
}

function getRegistrationName(registration) {
  const source =
    registration?.registration ||
    registration?.creator ||
    registration?.user ||
    registration?.player ||
    registration;
  const members = Array.isArray(registration?.members)
    ? registration.members
    : Array.isArray(source?.members)
      ? source.members
      : [];
  const names = members.map(getMemberName).filter(Boolean);
  return (
    registration?.athleteName ||
    registration?.name ||
    source?.athleteName ||
    source?.name ||
    (names.length ? names.join(" / ") : `Registration #${getRegistrationId(registration)}`)
  );
}

function getRegistrationDetail(registration) {
  const source = registration?.registration || registration;
  return (
    registration?.email ||
    registration?.contactEmail ||
    source?.email ||
    source?.contactEmail ||
    ""
  );
}

function flattenMatches(draw) {
  if (Array.isArray(draw?.matches)) return draw.matches;
  if (!Array.isArray(draw?.rounds)) return [];
  return draw.rounds.flatMap((round, roundIndex) =>
    (Array.isArray(round.matches) ? round.matches : []).map((match) => ({
      ...match,
      roundName:
        match.roundName ||
        round.name ||
        round.roundName ||
        round.title ||
        (round.roundNumber != null
          ? `Round ${round.roundNumber}`
          : `Round ${roundIndex + 1}`),
    })),
  );
}

function getRoundName(match) {
  if (match.roundName || match.round?.name || match.roundTitle) {
    return match.roundName || match.round?.name || match.roundTitle;
  }
  if (typeof match.round === "string") return match.round;
  if (match.roundNumber != null) return `Round ${match.roundNumber}`;
  return "Matches";
}

function getParticipant(match, side, registrationsById) {
  const participantList = Array.isArray(match?.participants)
    ? match.participants
    : Array.isArray(match?.entries)
      ? match.entries
      : null;
  const listParticipant = participantList?.[side - 1];
  const direct =
    listParticipant ??
    match[`participant${side}`] ??
    match[`participant${side}Registration`] ??
    match[`player${side}`] ??
    match[`registration${side}`] ??
    match[`participant${side}Name`] ??
    match[`player${side}Name`] ??
    match[`athlete${side}`] ??
    match[`athlete${side}Name`] ??
    null;
  if (direct && typeof direct === "object") {
    return (
      direct.name ||
      direct.athleteName ||
      direct.registrationName ||
      direct.player?.name ||
      direct.user?.name ||
      direct.registration?.name ||
      "Awaiting player"
    );
  }
  const registrationId =
    (direct && typeof direct === "object"
      ? direct.registrationId ?? direct.registration?.id ?? direct.id
      : null) ??
    match[`participant${side}RegistrationId`] ??
    match[`participant${side}?.registrationId`] ??
    match[`participant${side}RegistrationId`] ??
    match[`participant${side}`]?.registrationId ??
    match[`player${side}`]?.registrationId ??
    match[`participant${side}Id`] ??
    match[`registration${side}Id`] ??
    match[`participant${side}`]?.id ??
    (typeof direct === "number" ? direct : null);
  if (registrationId != null) {
    return registrationsById.get(String(registrationId)) ||
      (typeof direct === "string" ? direct : `Registration #${registrationId}`);
  }
  return typeof direct === "string" && direct.trim()
    ? direct
    : "Awaiting player";
}

function getMatchStatus(match) {
  const status = String(
    match.status || match.matchStatus || match.state || "pending",
  ).toLowerCase();
  if (status === "in_progress" || status === "live") return "in progress";
  if (status === "finished" || status === "complete") return "completed";
  if (status === "cancelled" || status === "canceled") return "walkover";
  return status;
}

function getMatchGames(match) {
  const games = Array.isArray(match.games)
    ? match.games
    : Array.isArray(match.results)
      ? match.results
      : [];
  return games.map((game, index) => ({
    gameNumber: Number(game.gameNumber ?? game.setNumber ?? index + 1),
    participant1Score:
      game.participant1Score ?? game.player1Score ?? game.score1 ?? "",
    participant2Score:
      game.participant2Score ?? game.player2Score ?? game.score2 ?? "",
  }));
}

function isMatchComplete(match) {
  const status = String(match.status || match.matchStatus || "").toLowerCase();
  return (
    ["completed", "complete", "finished", "final"].includes(status) ||
    match.winner != null ||
    match.winnerRegistrationId != null
  );
}

function getLatestDraw(draws) {
  if (!draws) return null;
  if (!Array.isArray(draws)) return unwrapDraw(draws);
  if (!draws.length) return null;
  return [...draws].sort((a, b) => {
    const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
    const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
    return aDate - bDate;
  })[draws.length - 1];
}

function getParticipantRegistrationId(match, side) {
  if (!match || typeof match !== "object") return null;
  const participantList = Array.isArray(match.participants)
    ? match.participants
    : Array.isArray(match.entries)
      ? match.entries
      : null;
  const listParticipant = participantList?.[side - 1];
  const direct =
    listParticipant ??
    match[`participant${side}`] ??
    match[`participant${side}Registration`] ??
    match[`player${side}`] ??
    match[`registration${side}`] ??
    null;
  return (
    match[`participant${side}RegistrationId`] ??
    match[`registration${side}Id`] ??
    match[`participant${side}Id`] ??
    (direct && typeof direct === "object"
      ? direct.registrationId ??
        direct.registration?.id ??
        direct.id ??
        null
      : typeof direct === "number"
        ? direct
        : null)
  );
}

function getWinnerSide(match) {
  if (!match || typeof match !== "object") return null;
  if (
    match.winnerSide != null ||
    match.winnerParticipant != null ||
    match.winnerPosition != null
  ) {
    const value =
      match.winnerSide ?? match.winnerParticipant ?? match.winnerPosition;
    const normalized = String(value).toLowerCase();
    if (["1", "participant1", "player1", "a"].includes(normalized)) return 1;
    if (["2", "participant2", "player2", "b"].includes(normalized)) return 2;
  }

  const winner = match.winner;
  const winnerId =
    match.winnerRegistrationId ??
    (winner && typeof winner === "object"
      ? winner.registrationId ?? winner.id
      : winner) ??
    match.winnerId ??
    null;
  if (winnerId != null) {
    const participant1Id = getParticipantRegistrationId(match, 1);
    const participant2Id = getParticipantRegistrationId(match, 2);
    if (participant1Id != null &&
      String(participant1Id) === String(winnerId)) return 1;
    if (participant2Id != null &&
      String(participant2Id) === String(winnerId)) return 2;
  }
  return null;
}

function formatTournamentDate(tournament) {
  const value =
    tournament?.startDate ||
    tournament?.startAt ||
    tournament?.date ||
    tournament?.createdAt;
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getChampion(draw) {
  if (!draw) return null;
  return (
    draw.champion ||
    draw.winner ||
    draw.tournamentChampion ||
    draw.finalMatch?.winner ||
    null
  );
}

export default function MatchesManagementPage() {
  const [tournaments, setTournaments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [eligibleRegistrations, setEligibleRegistrations] = useState([]);
  const [draw, setDraw] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [awards, setAwards] = useState([]);
  const [scoreMatch, setScoreMatch] = useState(null);
  const [scoreGames, setScoreGames] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [listReloadKey, setListReloadKey] = useState(0);
  const [selectedBracketRound, setSelectedBracketRound] = useState("All");
  const [bracketZoom, setBracketZoom] = useState(1);
  const [participantSearch, setParticipantSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadLists() {
      setLoadingLists(true);
      setError("");
      try {
        const tournamentResult = await getTournaments({
          page: 1,
          pageSize: 100,
        });
        if (cancelled) return;
        const tournamentList = tournamentResult.tournaments;
        const firstTournament = tournamentList[0];
        const firstTournamentCategories = Array.isArray(
          firstTournament?.categories,
        )
          ? firstTournament.categories
          : [];
        setTournaments(tournamentList);
        setCategories(firstTournamentCategories);
        setSelectedTournamentId(String(firstTournament?.id ?? ""));
        setSelectedCategoryId(
          String(firstTournamentCategories[0]?.id ?? ""),
        );
      } catch (requestError) {
        if (!cancelled) {
          setError(messageFrom(requestError, "Unable to load tournaments and categories."));
        }
      } finally {
        if (!cancelled) setLoadingLists(false);
      }
    }

    loadLists();
    return () => {
      cancelled = true;
    };
  }, [listReloadKey]);

  useEffect(() => {
    if (!selectedCategoryId) {
      return undefined;
    }

    let cancelled = false;
    async function loadCategoryData() {
      setLoadingCategory(true);
      setError("");
      setActionError("");
      setNotice("");
      setAwards([]);
      try {
        const [registrations, draws] = await Promise.all([
          getEligibleRegistrations(selectedCategoryId),
          getCategoryDraws(selectedCategoryId),
        ]);
        if (cancelled) return;
        setEligibleRegistrations(registrations);
        const latestDraw = getLatestDraw(draws);
        setDraw(latestDraw);
        const initialAssignments = {};
        (latestDraw?.assignments || []).forEach((assignment) => {
          const registrationId =
            assignment.registrationId ??
            assignment.registration?.id ??
            assignment.registration?.registrationId;
          const position =
            assignment.bracketPosition ?? assignment.position;
          if (registrationId != null && position != null) {
            initialAssignments[String(registrationId)] = String(position);
          }
        });
        setAssignments(initialAssignments);
      } catch (requestError) {
        if (!cancelled) {
          setError(messageFrom(requestError, "Unable to load draw data."));
          setEligibleRegistrations([]);
          setDraw(null);
          setAssignments({});
        }
      } finally {
        if (!cancelled) setLoadingCategory(false);
      }
    }

    loadCategoryData();
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, reloadKey]);

  const selectedTournament = tournaments.find(
    (tournament) => String(tournament.id) === selectedTournamentId,
  );
  const selectedCategory = categories.find(
    (category) => String(category.id) === selectedCategoryId,
  );
  const matches = useMemo(() => flattenMatches(draw), [draw]);
  const registrationsById = useMemo(
    () =>
      new Map(
        eligibleRegistrations
          .map((registration) => [
            String(getRegistrationId(registration)),
            getRegistrationName(registration),
          ])
          .filter(([id]) => id !== "null"),
      ),
    [eligibleRegistrations],
  );
  const visibleEligibleRegistrations = useMemo(() => {
    const query = participantSearch.trim().toLowerCase();
    if (!query) return eligibleRegistrations;
    return eligibleRegistrations.filter((registration) => {
      const name = getRegistrationName(registration).toLowerCase();
      const registrationId = String(getRegistrationId(registration));
      return name.includes(query) || registrationId.includes(query);
    });
  }, [eligibleRegistrations, participantSearch]);
  const rounds = useMemo(() => {
    const grouped = new Map();
    matches.forEach((match) => {
      const name = getRoundName(match);
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name).push(match);
    });
    return [...grouped.entries()];
  }, [matches]);

  const drawId = getDrawId(draw);
  const drawStatus = String(
    draw?.status || draw?.drawStatus || (draw ? "DRAFT" : ""),
  ).toLowerCase();
  const isPublished =
    Boolean(draw?.publishedAt) ||
    draw?.published === true ||
    ["published", "in_progress", "completed", "finalized"].includes(drawStatus);
  const isFinalized =
    draw?.finalized === true ||
    Boolean(draw?.finalizedAt || draw?.resultsFinalizedAt) ||
    ["finalized", "results_finalized"].includes(drawStatus);
  const positionLimit = Math.max(
    2,
    2 ** Math.ceil(Math.log2(Math.max(eligibleRegistrations.length, 2))),
  );
  const assignedEntries = eligibleRegistrations
    .map((registration) => ({
      registrationId: getRegistrationId(registration),
      bracketPosition: Number(
        assignments[String(getRegistrationId(registration))],
      ),
    }))
    .filter(
      (assignment) =>
        assignment.registrationId != null &&
        Number.isInteger(assignment.bracketPosition) &&
        assignment.bracketPosition > 0,
    );
  const allMatchesComplete =
    matches.length > 0 && matches.every(isMatchComplete);

  function handleCategoryChange(nextCategoryId) {
    setSelectedCategoryId(nextCategoryId);
    setEligibleRegistrations([]);
    setDraw(null);
    setAssignments({});
    setAwards([]);
    setError("");
    setActionError("");
    setNotice("");
  }

  function handleTournamentChange(nextTournamentId) {
    setSelectedTournamentId(nextTournamentId);
    const tournament = tournaments.find(
      (item) => String(item.id) === String(nextTournamentId),
    );
    const tournamentCategories = Array.isArray(tournament?.categories)
      ? tournament.categories
      : [];
    setCategories(tournamentCategories);
    setSelectedCategoryId(
      String(tournamentCategories[0]?.id ?? ""),
    );
    setEligibleRegistrations([]);
    setDraw(null);
    setAssignments({});
    setAwards([]);
    setError("");
    setActionError("");
    setNotice("");
  }

  async function refreshDraw(id = drawId) {
    if (!id) {
      setReloadKey((key) => key + 1);
      return;
    }
    const freshDraw = unwrapDraw(
      await getCategoryDraw(selectedCategoryId, id),
    );
    setDraw(freshDraw);
    const freshAssignments = {};
    (freshDraw.assignments || []).forEach((assignment) => {
      const registrationId =
        assignment.registrationId ?? assignment.registration?.id;
      const position = assignment.bracketPosition ?? assignment.position;
      if (registrationId != null && position != null) {
        freshAssignments[String(registrationId)] = String(position);
      }
    });
    setAssignments(freshAssignments);
  }

  async function handleCreateDraw() {
    setBusyAction("create");
    setActionError("");
    setNotice("");
    try {
      const created = unwrapDraw(
        await createCategoryDraw(selectedCategoryId),
      );
      const createdId = getDrawId(created);
      if (createdId != null) {
        await refreshDraw(createdId);
      } else {
        setReloadKey((key) => key + 1);
      }
      setNotice("Draft draw created.");
    } catch (requestError) {
      setActionError(messageFrom(requestError, "Unable to create the draw."));
    } finally {
      setBusyAction("");
    }
  }

  async function handleSaveAssignments() {
    if (!drawId) return;
    const positions = assignedEntries.map((assignment) => assignment.bracketPosition);
    if (assignedEntries.length !== eligibleRegistrations.length) {
      setActionError(
        "Assign every eligible registration before saving the complete assignment set.",
      );
      return;
    }
    if (new Set(positions).size !== positions.length) {
      setActionError("Each registration must have a unique bracket position.");
      return;
    }

    setBusyAction("assign");
    setActionError("");
    setNotice("");
    try {
      await assignDrawPositions(drawId, assignedEntries);
      await refreshDraw();
      setNotice("Bracket positions saved.");
    } catch (requestError) {
      setActionError(messageFrom(requestError, "Unable to save bracket positions."));
    } finally {
      setBusyAction("");
    }
  }

  async function handlePublishDraw() {
    if (!drawId) return;
    setBusyAction("publish");
    setActionError("");
    setNotice("");
    try {
      await publishCategoryDraw(drawId);
      await refreshDraw();
      setNotice("Draw published.");
    } catch (requestError) {
      setActionError(messageFrom(requestError, "Unable to publish the draw."));
    } finally {
      setBusyAction("");
    }
  }

  async function handleLoadAwards() {
    setBusyAction("awards");
    setActionError("");
    try {
      const result = await getCategoryRankingPointAwards(selectedCategoryId);
      setAwards(result);
      setNotice("Ranking-point awards loaded.");
    } catch (requestError) {
      setActionError(messageFrom(requestError, "Unable to load ranking-point awards."));
    } finally {
      setBusyAction("");
    }
  }

  async function handleFinalize() {
    if (!drawId) return;
    setBusyAction("finalize");
    setActionError("");
    setNotice("");
    try {
      await finalizeCategoryDraw(drawId);
      await refreshDraw();
      const result = await getCategoryRankingPointAwards(selectedCategoryId);
      setAwards(result);
      setNotice("Results finalized and ranking-point awards loaded.");
    } catch (requestError) {
      setActionError(messageFrom(requestError, "Unable to finalize tournament results."));
    } finally {
      setBusyAction("");
    }
  }

  function openScoreEditor(match) {
    const existingGames = getMatchGames(match);
    setScoreGames(
      existingGames.length
        ? existingGames
        : [
            { gameNumber: 1, participant1Score: "", participant2Score: "" },
            { gameNumber: 2, participant1Score: "", participant2Score: "" },
            { gameNumber: 3, participant1Score: "", participant2Score: "" },
          ],
    );
    setScoreMatch(match);
    setActionError("");
  }

  async function handleSaveMatchResult() {
    if (!scoreMatch || !drawId) return;
    const startedGames = scoreGames.filter(
      (game) =>
        game.participant1Score !== "" || game.participant2Score !== "",
    );
    if (
      startedGames.some(
        (game) =>
          game.participant1Score === "" || game.participant2Score === "",
      )
    ) {
      setActionError(
        "Enter both participant scores for every game you have started.",
      );
      return;
    }
    const games = startedGames.map((game, index) => ({
      gameNumber: index + 1,
      participant1Score: Number(game.participant1Score),
      participant2Score: Number(game.participant2Score),
    }));

    if (
      games.length === 0 ||
      games.some(
        (game) =>
          !Number.isInteger(game.participant1Score) ||
          !Number.isInteger(game.participant2Score) ||
          game.participant1Score < 0 ||
          game.participant2Score < 0 ||
          game.participant1Score === game.participant2Score,
      )
    ) {
      setActionError("Enter a non-negative, non-tied score for each game.");
      return;
    }

    const matchId = scoreMatch.id ?? scoreMatch.matchId;
    if (matchId == null) {
      setActionError("This match has no ID; the result cannot be saved.");
      return;
    }
    setBusyAction("score");
    setActionError("");
    setNotice("");
    try {
      await updateMatchResult(drawId, matchId, games);
      await refreshDraw();
      setScoreMatch(null);
      setNotice("Match result saved.");
    } catch (requestError) {
      setActionError(messageFrom(requestError, "Unable to save match result."));
    } finally {
      setBusyAction("");
    }
  }

  const statusLabel = isFinalized
    ? "Finalized"
    : isPublished
      ? "Published"
      : draw
        ? "Draft"
        : "No draw";

  return (
    <main
      style={{
        padding: "24px",
        backgroundColor: "#f8fafc",
        minHeight: "calc(100vh - 75px)",
        boxSizing: "border-box",
        color: "#0f172a",
        fontFamily: "sans-serif",
      }}
    >
      <section
        style={{
          marginBottom: "20px",
          border: "1px solid #1e3a52",
          borderRadius: "14px",
          background:
            "linear-gradient(135deg, #0D1B2A 0%, #12283a 68%, #172f45 100%)",
          color: "#ffffff",
          padding: "20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            minWidth: "260px",
            flex: "1 1 420px",
          }}
        >
          <div
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "12px",
              background: "#EF3340",
              display: "grid",
              placeItems: "center",
              fontSize: "22px",
              fontWeight: 900,
              boxShadow: "0 10px 24px rgba(239,51,64,0.22)",
            }}
          >
            NYX
          </div>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <h1 style={{ margin: 0, fontSize: "20px", letterSpacing: "-0.02em" }}>
                {selectedTournament?.title || "Tournament Bracket"}
              </h1>
              <span
                style={{
                  borderRadius: "999px",
                  backgroundColor: "#ef3340",
                  padding: "4px 8px",
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                {statusLabel}
              </span>
            </div>
            <p
              style={{
                margin: "7px 0 0",
                color: "#b8c5d1",
                fontSize: "12px",
              }}
            >
              {selectedCategory?.categoryName ||
                selectedCategory?.name ||
                "Select a category"}{" "}
              · Single Elimination · {eligibleRegistrations.length} participants
              · {formatTournamentDate(selectedTournament)}
            </p>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <label style={{ color: "#cbd5e1", fontSize: "11px", fontWeight: 700 }}>
            Tournament
            <select
              value={selectedTournamentId}
              onChange={(event) => handleTournamentChange(event.target.value)}
              disabled={loadingLists}
              style={{
                ...inputStyle,
                minWidth: "180px",
                marginTop: "5px",
                backgroundColor: "#102235",
                color: "#ffffff",
                border: "1px solid #355167",
              }}
            >
              <option value="">Select tournament</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.title}
                </option>
              ))}
            </select>
          </label>
          <label style={{ color: "#cbd5e1", fontSize: "11px", fontWeight: 700 }}>
            Category
            <select
              value={selectedCategoryId}
              onChange={(event) => handleCategoryChange(event.target.value)}
              disabled={loadingLists}
              style={{
                ...inputStyle,
                minWidth: "190px",
                marginTop: "5px",
                backgroundColor: "#102235",
                color: "#ffffff",
                border: "1px solid #355167",
              }}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.categoryName || category.name} (
                  {category.categoryCode})
                </option>
              ))}
            </select>
          </label>
          {!draw && (
            <button
              type="button"
              onClick={handleCreateDraw}
              disabled={busyAction !== "" || eligibleRegistrations.length < 2}
              style={{
                ...buttonStyle,
                marginTop: "18px",
                backgroundColor: "#EF3340",
              }}
            >
              {busyAction === "create" ? "Generating…" : "Generate Bracket"}
            </button>
          )}
          {draw && !isPublished && (
            <button
              type="button"
              onClick={handlePublishDraw}
              disabled={
                busyAction !== "" ||
                assignedEntries.length !== eligibleRegistrations.length
              }
              style={{
                ...buttonStyle,
                marginTop: "18px",
                backgroundColor: "#EF3340",
              }}
            >
              {busyAction === "publish" ? "Publishing…" : "Publish Bracket"}
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              selectedCategoryId
                ? setReloadKey((key) => key + 1)
                : setListReloadKey((key) => key + 1)
            }
            disabled={loadingLists || loadingCategory}
            style={{
              ...buttonStyle,
              marginTop: "18px",
              backgroundColor: "#1b3448",
              border: "1px solid #355167",
            }}
          >
            <RefreshIcon fontSize="small" />
          </button>
        </div>
      </section>

      {loadingLists && <p role="status">Loading tournaments and categories…</p>}
      {loadingCategory && <p role="status">Loading eligible registrations and draw…</p>}
      {error && (
        <div role="alert" style={{ ...cardStyle, color: "#b91c1c" }}>
          {error}
          <button
            type="button"
            onClick={() =>
              selectedCategoryId
                ? setReloadKey((key) => key + 1)
                : setListReloadKey((key) => key + 1)
            }
            style={{ ...buttonStyle, marginLeft: "12px" }}
          >
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <div role="alert" style={{ ...cardStyle, color: "#b91c1c" }}>
          {actionError}
        </div>
      )}
      {notice && (
        <div
          role="status"
          style={{
            ...cardStyle,
            padding: "12px 16px",
            color: "#166534",
            backgroundColor: "#f0fdf4",
          }}
        >
          {notice}
        </div>
      )}

      {!loadingLists && !error && !selectedCategoryId && (
        <section style={cardStyle}>
          <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
            No categories are available. Add tournament categories before
            managing draws.
          </p>
        </section>
      )}

      {!loadingLists && !loadingCategory && selectedCategoryId && !error && (
        <>
          <section style={cardStyle}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 5px", fontSize: "17px" }}>
                  Eligible registrations
                </h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>
                  {eligibleRegistrations.length} confirmed registration
                  {eligibleRegistrations.length === 1 ? "" : "s"}
                </p>
              </div>
              <input
                type="search"
                value={participantSearch}
                onChange={(event) => setParticipantSearch(event.target.value)}
                placeholder="Search participant or registration"
                style={{
                  ...inputStyle,
                  maxWidth: "260px",
                  marginRight: "auto",
                  marginLeft: "14px",
                }}
              />
              {!draw && (
                <button
                  type="button"
                  onClick={handleCreateDraw}
                  disabled={
                    busyAction !== "" || eligibleRegistrations.length < 2
                  }
                  style={buttonStyle}
                >
                  <AddIcon
                    style={{ fontSize: "16px", verticalAlign: "middle" }}
                  />{" "}
                  {busyAction === "create" ? "Creating…" : "Create draft draw"}
                </button>
              )}
            </div>
            {eligibleRegistrations.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "13px" }}>
                No eligible registrations were returned for this category.
              </p>
            ) : (
              <div
                style={{
                  maxHeight: "420px",
                  overflow: "auto",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        color: "#64748b",
                        backgroundColor: "#f8fafc",
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                      }}
                    >
                      <th style={{ padding: "11px" }}>REGISTRATION</th>
                      <th style={{ padding: "11px" }}>PLAYER / TEAM</th>
                      {draw && !isPublished && (
                        <th style={{ padding: "11px", width: "190px" }}>
                          BRACKET POSITION
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEligibleRegistrations.map((registration) => {
                      const registrationId = getRegistrationId(registration);
                      const key = String(registrationId);
                      return (
                        <tr
                          key={key}
                          style={{ borderTop: "1px solid #e2e8f0" }}
                        >
                          <td style={{ padding: "12px 11px" }}>
                            #{registrationId}
                          </td>
                          <td style={{ padding: "12px 11px" }}>
                            <strong>{getRegistrationName(registration)}</strong>
                            {getRegistrationDetail(registration) && (
                              <div
                                style={{
                                  marginTop: "3px",
                                  color: "#64748b",
                                  fontSize: "11px",
                                }}
                              >
                                {getRegistrationDetail(registration)}
                              </div>
                            )}
                          </td>
                          {draw && !isPublished && (
                            <td style={{ padding: "8px 11px" }}>
                              <select
                                value={assignments[key] || ""}
                                onChange={(event) =>
                                  setAssignments((current) => ({
                                    ...current,
                                    [key]: event.target.value,
                                  }))
                                }
                                style={inputStyle}
                              >
                                <option value="">Not assigned</option>
                                {Array.from(
                                  { length: positionLimit },
                                  (_, index) => index + 1,
                                ).map((position) => (
                                  <option key={position} value={position}>
                                    Position {position}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {draw && !isPublished && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "16px",
                }}
              >
                <button
                  type="button"
                  onClick={handleSaveAssignments}
                  disabled={
                    busyAction !== "" ||
                    assignedEntries.length !== eligibleRegistrations.length
                  }
                  style={buttonStyle}
                >
                  {busyAction === "assign"
                    ? "Saving positions…"
                    : "Save complete assignment"}
                </button>
                <button
                  type="button"
                  onClick={handlePublishDraw}
                  disabled={
                    busyAction !== "" ||
                    assignedEntries.length !== eligibleRegistrations.length ||
                    new Set(
                      assignedEntries.map(
                        (assignment) => assignment.bracketPosition,
                      ),
                    ).size !== assignedEntries.length
                  }
                  style={{ ...buttonStyle, backgroundColor: "#15803d" }}
                >
                  {busyAction === "publish" ? "Publishing…" : "Publish draw"}
                </button>
                <span style={{ color: "#64748b", fontSize: "11px" }}>
                  Saving replaces all positions currently stored for this draw.
                </span>
              </div>
            )}
          </section>

          {draw && (
            <section
              style={{
                marginBottom: "10px",
                padding: "14px 16px 12px",
                border: "1px solid #dfe5ec",
                borderRadius: "12px",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 5px", fontSize: "17px", color: "#0f172a" }}>
                    Bracket rounds
                  </h2>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>
                    Bracket and match data loaded from the selected draw.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <button
                    type="button"
                    onClick={() =>
                      setBracketZoom((zoom) =>
                        Math.max(0.75, Number((zoom - 0.1).toFixed(2))),
                      )
                    }
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setBracketZoom(1)}
                    style={{
                      height: "32px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#334155",
                      padding: "0 10px",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    {Math.round(bracketZoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBracketZoom((zoom) =>
                        Math.min(1.25, Number((zoom + 0.1).toFixed(2))),
                      )
                    }
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    +
                  </button>
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: "20px",
                      backgroundColor: isPublished ? "#123926" : "#3d3020",
                      color: isPublished ? "#86efac" : "#fcd34d",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
              {rounds.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    overflowX: "auto",
                    paddingBottom: "6px",
                  }}
                >
                  <div style={{ display: "flex", gap: "7px" }}>
                    {["All", ...rounds.map(([roundName]) => roundName)].map(
                      (roundName) => (
                        <button
                          key={roundName}
                          type="button"
                          onClick={() => setSelectedBracketRound(roundName)}
                          style={{
                            border:
                              selectedBracketRound === roundName
                                ? "1px solid #EF3340"
                                : "1px solid #cbd5e1",
                            borderRadius: "999px",
                            backgroundColor:
                              selectedBracketRound === roundName
                                ? "#EF3340"
                                : "#ffffff",
                            color:
                              selectedBracketRound === roundName
                                ? "#ffffff"
                                : "#475569",
                            padding: "6px 10px",
                            whiteSpace: "nowrap",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {roundName}
                        </button>
                      ),
                    )}
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      gap: "10px",
                      whiteSpace: "nowrap",
                      color: "#64748b",
                      fontSize: "10px",
                    }}
                  >
                    {[
                      ["#64748b", "Pending"],
                      ["#2563eb", "In progress"],
                      ["#16a34a", "Completed"],
                      ["#94a3b8", "BYE"],
                    ].map(([color, label]) => (
                      <span
                        key={label}
                        style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            backgroundColor: color,
                          }}
                        />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {rounds.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "13px" }}>
                  No bracket matches are available yet. Assign positions and
                  publish the draw to generate the bracket.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    gap: "0",
                    overflowX: "auto",
                    padding: "6px 8px 8px",
                    position: "relative",
                    transform: `scale(${bracketZoom})`,
                    transformOrigin: "top left",
                    width: `${100 / bracketZoom}%`,
                  }}
                >
                  {selectedBracketRound === "All" && (
                    <svg
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: "0",
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                        zIndex: 0,
                        overflow: "visible",
                      }}
                    >
                      {rounds.map(([roundName, roundMatches], roundIndex) => {
                        if (roundIndex >= rounds.length - 1) return null;
                        const nextRoundMatches =
                          rounds[roundIndex + 1]?.[1] || [];
                        const cardGap = getBracketMatchGap(roundIndex);
                        const nextCardGap = getBracketMatchGap(
                          roundIndex + 1,
                        );
                        const cardPitch = BRACKET_MATCH_HEIGHT + cardGap;
                        const nextCardPitch =
                          BRACKET_MATCH_HEIGHT + nextCardGap;
                        const roundPadding =
                          getBracketRoundPadding(roundIndex);
                        const nextRoundPadding =
                          getBracketRoundPadding(roundIndex + 1);
                        const sourceX =
                          8 +
                          roundIndex * BRACKET_TRACK_WIDTH +
                          BRACKET_COLUMN_WIDTH;
                        const targetX =
                          8 +
                          (roundIndex + 1) * BRACKET_TRACK_WIDTH;
                        const joinX = sourceX + 9;

                        return roundMatches
                          .filter((_, index) => index % 2 === 0)
                          .map((_, pairIndex) => {
                            const sourceIndex = pairIndex * 2;
                            const sourceMatch =
                              roundMatches[sourceIndex];
                            const pairedMatch =
                              roundMatches[sourceIndex + 1];
                            if (!sourceMatch && !pairedMatch) return null;

                            const firstY =
                              8 +
                              roundPadding +
                              sourceIndex * cardPitch +
                              BRACKET_MATCH_HEIGHT / 2;
                            const secondY =
                              8 +
                              roundPadding +
                              (sourceIndex + 1) * cardPitch +
                              BRACKET_MATCH_HEIGHT / 2;
                            const targetY =
                              8 +
                              nextRoundPadding +
                              pairIndex * nextCardPitch +
                              BRACKET_MATCH_HEIGHT / 2;
                            const topY = Math.min(firstY, secondY);
                            const bottomY =
                              pairedMatch == null
                                ? firstY
                                : Math.max(firstY, secondY);
                            const targetYWithinNext =
                              pairIndex < nextRoundMatches.length
                                ? targetY
                                : (topY + bottomY) / 2;

                            return (
                              <g
                                key={`${roundName}-connector-${pairIndex}`}
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="1.5"
                                strokeLinecap="square"
                                strokeLinejoin="round"
                              >
                                <path d={`M ${sourceX} ${firstY} H ${joinX}`} />
                                {pairedMatch && (
                                  <path
                                    d={`M ${sourceX} ${secondY} H ${joinX}`}
                                  />
                                )}
                                {pairedMatch && (
                                  <path
                                    d={`M ${joinX} ${topY} V ${bottomY}`}
                                  />
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
                  {rounds
                    .filter(
                      ([roundName]) =>
                        selectedBracketRound === "All" ||
                        selectedBracketRound === roundName,
                    )
                    .map(([roundName, roundMatches], roundIndex) => (
                      <div
                        key={roundName}
                        style={{
                          display: "flex",
                          alignItems: "stretch",
                          flex: `0 0 ${BRACKET_TRACK_WIDTH}px`,
                          width: `${BRACKET_TRACK_WIDTH}px`,
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            width: `${BRACKET_COLUMN_WIDTH}px`,
                            display: "flex",
                            flexDirection: "column",
                            gap: `${getBracketMatchGap(roundIndex)}px`,
                            paddingTop: `${getBracketRoundPadding(roundIndex)}px`,
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
                          {roundMatches.map((match, index) => {
                            const matchId =
                              match.id ?? match.matchId ?? index + 1;
                            const first = getParticipant(
                              match,
                              1,
                              registrationsById,
                            );
                            const second = getParticipant(
                              match,
                              2,
                              registrationsById,
                            );
                            const winnerSide = getWinnerSide(match);
                            const isExplicitBye =
                              getMatchStatus(match) === "bye" ||
                              match.isBye === true ||
                              match.bye === true;
                            const firstLabel =
                              first === "Awaiting player" ? "Awaiting player" : first;
                            const secondLabel =
                              isExplicitBye
                                ? "BYE"
                                : second === "Awaiting player"
                                  ? "Awaiting player"
                                  : second;

                            return (
                              <article
                                key={`${roundName}-${matchId}-${index}`}
                                onClick={() =>
                                  isPublished && openScoreEditor(match)
                                }
                                style={{
                                  height: `${BRACKET_MATCH_HEIGHT}px`,
                                  boxSizing: "border-box",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                  cursor:
                                    isPublished && !isFinalized
                                      ? "pointer"
                                      : "default",
                                }}
                              >
                                {[firstLabel, secondLabel].map((label, participantIndex) => (
                                  <div
                                    key={`${participantIndex}-${label}`}
                                    style={{
                                      height: "24px",
                                      boxSizing: "border-box",
                                      display: "flex",
                                      alignItems: "center",
                                      padding: "0 10px",
                                      borderRadius: "4px",
                                      backgroundColor:
                                        winnerSide === participantIndex + 1
                                          ? "#86efac"
                                          : "#536b7e",
                                      color:
                                        winnerSide === participantIndex + 1
                                          ? "#14532d"
                                          : "#ffffff",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      overflow: "hidden",
                                      whiteSpace: "nowrap",
                                      textOverflow: "ellipsis",
                                    }}
                                    title={`Match #${matchId}: ${label}`}
                                  >
                                    {winnerSide === participantIndex + 1 ? "✓ " : ""}
                                    {label}
                                  </div>
                                ))}
                              </article>
                            );
                          })}
                        </div>
                        {selectedBracketRound === "All" &&
                          roundIndex <
                            rounds.filter(
                              () => selectedBracketRound === "All",
                            ).length -
                              1 && <div style={{ width: "18px", flex: "0 0 18px" }} />}
                      </div>
                    ))}
                </div>
              )}
            </section>
          )}

          {draw && (isFinalized || getChampion(draw)) && (() => {
            const champion = getChampion(draw);
            const championName =
              champion?.name ||
              champion?.athleteName ||
              champion?.player?.name ||
              champion?.user?.name ||
              (typeof champion === "string" ? champion : "Champion");
            const finalRoundMatch = [...matches].reverse().find((match) =>
              /final/i.test(getRoundName(match)),
            );
            const finalGames = finalRoundMatch
              ? getMatchGames(finalRoundMatch)
              : [];
            return (
              <section
                style={{
                  marginBottom: "20px",
                  borderRadius: "14px",
                  border: "1px solid #c6a24a",
                  background:
                    "linear-gradient(135deg, #172235 0%, #0D1B2A 70%)",
                  padding: "20px",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      backgroundColor: "#d9b44a",
                      color: "#0D1B2A",
                      fontSize: "28px",
                      fontWeight: 900,
                    }}
                  >
                    {championName
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div
                      style={{
                        color: "#d9b44a",
                        fontSize: "10px",
                        fontWeight: 900,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      Tournament Champion
                    </div>
                    <h2 style={{ margin: "4px 0 0", fontSize: "22px" }}>
                      {championName}
                    </h2>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#91a4b5", fontSize: "11px" }}>
                    {selectedTournament?.title || "Tournament"}
                  </div>
                  <div
                    style={{
                      marginTop: "5px",
                      fontFamily: "monospace",
                      fontSize: "16px",
                      fontWeight: 800,
                    }}
                  >
                    {finalGames.length
                      ? finalGames
                          .map(
                            (game) =>
                              `${game.participant1Score}-${game.participant2Score}`,
                          )
                          .join("  ")
                      : "Final score unavailable"}
                  </div>
                </div>
              </section>
            );
          })()}

          {draw && (
            <section
              style={{
                ...cardStyle,
                marginTop: "0",
                marginBottom: "10px",
                padding: "14px 16px",
              }}
            >
              <h2 style={{ margin: "0 0 10px", fontSize: "17px" }}>
                Match results
              </h2>
              {matches.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "13px" }}>
                  No matches are available in this draw yet.
                </p>
              ) : (
                <div
                  style={{
                    maxHeight: "420px",
                    overflow: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      minWidth: "720px",
                      borderCollapse: "collapse",
                      textAlign: "left",
                      fontSize: "12px",
                    }}
                  >
                  <thead>
                    <tr
                      style={{
                        color: "#64748b",
                        backgroundColor: "#f8fafc",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                      }}
                    >
                      <th style={{ padding: "12px" }}>MATCH</th>
                      <th style={{ padding: "12px" }}>ROUND</th>
                      <th style={{ padding: "12px" }}>PARTICIPANTS</th>
                      <th style={{ padding: "12px" }}>GAMES</th>
                      <th style={{ padding: "12px" }}>STATUS</th>
                      {isPublished && (
                        <th style={{ padding: "12px", textAlign: "right" }}>
                          ACTION
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match, index) => {
                      const gameScores = getMatchGames(match);
                      return (
                        <tr
                          key={match.id ?? match.matchId ?? index}
                          style={{ borderTop: "1px solid #e2e8f0" }}
                        >
                          <td style={{ padding: "12px" }}>
                            #{match.id ?? match.matchId ?? index + 1}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {getRoundName(match)}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {getParticipant(match, 1, registrationsById)}
                            {" vs "}
                            {getParticipant(match, 2, registrationsById)}
                          </td>
                          <td style={{ padding: "12px", fontFamily: "monospace" }}>
                            {gameScores.length
                              ? gameScores
                                  .map(
                                    (game) =>
                                      `${game.participant1Score}-${game.participant2Score}`,
                                  )
                                  .join(", ")
                              : "—"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {String(
                              match.status || match.matchStatus || "pending",
                            ).toUpperCase()}
                          </td>
                          {isPublished && (
                            <td style={{ padding: "12px", textAlign: "right" }}>
                              <button
                                type="button"
                                onClick={() => openScoreEditor(match)}
                                disabled={busyAction !== "" || isFinalized}
                                style={{
                                  ...buttonStyle,
                                  padding: "7px 10px",
                                }}
                              >
                                {isMatchComplete(match)
                                  ? "Update result"
                                  : "Enter result"}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {draw && isPublished && (
            <section style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={
                    busyAction !== "" ||
                    isFinalized ||
                    !allMatchesComplete
                  }
                  style={{
                    ...buttonStyle,
                    backgroundColor: "#15803d",
                    opacity:
                      isFinalized || !allMatchesComplete ? 0.6 : 1,
                  }}
                >
                  {busyAction === "finalize"
                    ? "Finalizing…"
                    : isFinalized
                      ? "Results finalized"
                      : "Finalize tournament results"}
                </button>
                <button
                  type="button"
                  onClick={handleLoadAwards}
                  disabled={busyAction !== ""}
                  style={{
                    ...buttonStyle,
                    backgroundColor: "#f1f5f9",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {busyAction === "awards"
                    ? "Loading awards…"
                    : "Load ranking-point awards"}
                </button>
                {!allMatchesComplete && !isFinalized && (
                  <span style={{ color: "#64748b", fontSize: "12px" }}>
                    Enter results for all matches before finalizing.
                  </span>
                )}
              </div>
              {awards.length > 0 && (
                <div style={{ overflowX: "auto", marginTop: "18px" }}>
                  <h3 style={{ fontSize: "14px" }}>Ranking-point awards</h3>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      textAlign: "left",
                      fontSize: "12px",
                    }}
                  >
                    <thead>
                      <tr style={{ color: "#64748b", backgroundColor: "#f8fafc" }}>
                        <th style={{ padding: "10px" }}>PLAYER / REGISTRATION</th>
                        <th style={{ padding: "10px" }}>AWARD</th>
                        <th style={{ padding: "10px" }}>CATEGORY</th>
                        <th style={{ padding: "10px" }}>POINTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {awards.map((award, index) => (
                        <tr
                          key={award.id ?? `${award.registrationId}-${index}`}
                          style={{ borderTop: "1px solid #e2e8f0" }}
                        >
                          <td style={{ padding: "11px 10px" }}>
                            {award.player?.name ||
                              award.registration?.name ||
                              award.name ||
                              (award.registrationId != null
                                ? `Registration #${award.registrationId}`
                                : "—")}
                          </td>
                          <td style={{ padding: "11px 10px" }}>
                            {award.label || award.position || award.awardName || "—"}
                          </td>
                          <td style={{ padding: "11px 10px" }}>
                            {award.categoryName || award.categoryCode || "—"}
                          </td>
                          <td style={{ padding: "11px 10px", fontWeight: 700 }}>
                            {award.points ?? award.pointsAwarded ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <p style={{ color: "#64748b", fontSize: "12px" }}>
            Live-match controls, scheduling, and court assignment are not
            available because the supplied API does not persist those actions.
          </p>
        </>
      )}

      {scoreMatch && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setScoreMatch(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            padding: "20px",
            display: "grid",
            placeItems: "center",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="score-dialog-title"
            style={{
              width: "100%",
              maxWidth: "540px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              borderRadius: "12px",
              backgroundColor: "#ffffff",
              boxSizing: "border-box",
            }}
          >
            <h2
              id="score-dialog-title"
              style={{ margin: "0 0 6px", fontSize: "17px" }}
            >
              Enter match result
            </h2>
            <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: "12px" }}>
              {getParticipant(scoreMatch, 1, registrationsById)} vs{" "}
              {getParticipant(scoreMatch, 2, registrationsById)}
            </p>
            {scoreGames.map((game, index) => (
              <div
                key={game.gameNumber}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <label style={{ fontSize: "12px" }}>
                  Game {index + 1} · P1
                  <input
                    type="number"
                    min="0"
                    value={game.participant1Score}
                    onChange={(event) =>
                      setScoreGames((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, participant1Score: event.target.value }
                            : item,
                        ),
                      )
                    }
                    style={{ ...inputStyle, marginTop: "5px" }}
                  />
                </label>
                <span style={{ textAlign: "center", color: "#64748b" }}>vs</span>
                <label style={{ fontSize: "12px" }}>
                  Game {index + 1} · P2
                  <input
                    type="number"
                    min="0"
                    value={game.participant2Score}
                    onChange={(event) =>
                      setScoreGames((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, participant2Score: event.target.value }
                            : item,
                        ),
                      )
                    }
                    style={{ ...inputStyle, marginTop: "5px" }}
                  />
                </label>
              </div>
            ))}
            {scoreGames.length < 5 && (
              <button
                type="button"
                onClick={() =>
                  setScoreGames((current) => [
                    ...current,
                    {
                      gameNumber: current.length + 1,
                      participant1Score: "",
                      participant2Score: "",
                    },
                  ])
                }
                style={{
                  ...buttonStyle,
                  backgroundColor: "#f1f5f9",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                }}
              >
                Add game
              </button>
            )}
            {actionError && (
              <p role="alert" style={{ color: "#b91c1c", fontSize: "12px" }}>
                {actionError}
              </p>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                type="button"
                onClick={() => setScoreMatch(null)}
                disabled={busyAction === "score"}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#f1f5f9",
                  color: "#334155",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMatchResult}
                disabled={busyAction === "score"}
                style={buttonStyle}
              >
                {busyAction === "score" ? "Saving…" : "Save result"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
