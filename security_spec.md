# Security Spec & Hardened Firestore Test Plan

## 1. Data Invariants
- Teachers (`users/{userId}`): Must be authenticated via Firebase Auth; only the owner can modify their profile.
- Quizzes (`quizzes/{quizId}`): Created by authenticated teachers; only the owner can update/delete their quiz. Public quizzes can be read by teachers.
- Sessions (`sessions/{sessionId}`): Created by an authenticated teacher (`hostId == request.auth.uid`). The host controls slide advancement and status (`lobby`, `question`, `result`, `leaderboard`, `podium`, `finished`).
- Students/Players (`sessions/{sessionId}/players/{playerId}`): Students join via PIN and can register themselves in the active session. Players can increment their own score according to submitted answers.
- Answers (`sessions/{sessionId}/answers/{answerId}`): Students submit their answers during active question states.

## 2. The Dirty Dozen Payloads
1. Unauthenticated user attempts to create a Quiz with another user's ID as `ownerId`.
2. Authenticated user attempts to modify someone else's Quiz title or questions.
3. Player attempts to tamper with session status (e.g., skip question) when not the `hostId`.
4. Attacker attempts to inject 2MB payload into session or answer `answer` string.
5. Student attempts to overwrite other student's player document or delete it.
6. Attacker attempts to list user documents or PII across all tenants.
7. Unauthenticated user attempts to read private quizzes belonging to other teachers.
8. Player attempts to submit an answer after session status is no longer `question`.
9. Attacker attempts to spoof admin or bypass auth checks with forged token.
10. Attacker attempts to create an orphaned player in a non-existent session.
11. Attacker attempts to pass ghost fields to bypass schema validation.
12. Attacker attempts to overwrite immutable creation timestamps.
