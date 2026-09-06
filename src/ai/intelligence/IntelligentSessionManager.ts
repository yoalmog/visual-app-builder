// D8.14: Intelligent Session Manager
// Durable persistence and restart-survival for AI development sessions.

import * as fs from 'fs';
import * as path from 'path';
import { DevelopmentSession, AutonomyLevel, GoalRepresentation, IntelligentPlan, SessionExecutionState } from './types';

export class IntelligentSessionManager {
  private static baseDir: string = process.cwd();

  public static setBaseDir(dir: string): void {
    this.baseDir = dir;
  }

  public static getSessionsFilePath(): string {
    return path.join(this.baseDir, '.phase8', 'sessions.json');
  }

  public static createSession(params: {
    projectId: string;
    goal?: GoalRepresentation;
    currentPlan?: IntelligentPlan;
    autonomyLevel?: AutonomyLevel;
  }): DevelopmentSession {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const session: DevelopmentSession = {
      sessionId,
      projectId: params.projectId,
      goal: params.goal,
      currentPlan: params.currentPlan,
      currentStepIndex: 0,
      autonomyLevel: params.autonomyLevel ?? 2,
      executionState: 'IDLE',
      timeline: [],
      verificationHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    const all = this.loadAllSessions();
    all.set(sessionId, session);
    this.persistAllSessions(all);

    return session;
  }

  public static getSession(sessionId: string): DevelopmentSession | undefined {
    const all = this.loadAllSessions();
    return all.get(sessionId);
  }

  public static updateSessionState(sessionId: string, state: SessionExecutionState): DevelopmentSession | undefined {
    const all = this.loadAllSessions();
    const session = all.get(sessionId);
    if (!session) return undefined;

    session.executionState = state;
    session.updatedAt = new Date().toISOString();
    all.set(sessionId, session);
    this.persistAllSessions(all);

    return session;
  }

  public static saveSession(session: DevelopmentSession): void {
    const all = this.loadAllSessions();
    session.updatedAt = new Date().toISOString();
    all.set(session.sessionId, session);
    this.persistAllSessions(all);
  }

  public static listSessions(): DevelopmentSession[] {
    const all = this.loadAllSessions();
    return Array.from(all.values());
  }

  private static loadAllSessions(): Map<string, DevelopmentSession> {
    const map = new Map<string, DevelopmentSession>();
    const filePath = this.getSessionsFilePath();
    if (!fs.existsSync(filePath)) return map;

    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(raw)) {
        for (const item of raw) {
          map.set(item.sessionId, item);
        }
      }
    } catch {
      // Fallback
    }
    return map;
  }

  private static persistAllSessions(map: Map<string, DevelopmentSession>): void {
    const filePath = this.getSessionsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(Array.from(map.values()), null, 2), 'utf-8');
  }
}
