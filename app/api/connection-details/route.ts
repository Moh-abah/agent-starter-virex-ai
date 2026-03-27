import { NextResponse } from 'next/server';
import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk';

export const revalidate = 0;

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

export async function POST(req: Request) {
  try {
    if (!LIVEKIT_URL || !API_KEY || !API_SECRET) {
      throw new Error('Missing LiveKit environment variables');
    }

    const body = await req.json();
    const agentName = body?.room_config?.agents?.[0]?.agent_name || 'VIREX-AI';

    const roomName = `voice_assistant_room_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const participantIdentity = `user_${Math.random().toString(36).substring(2, 8)}`;

    const at = new AccessToken(API_KEY, API_SECRET, {
      identity: participantIdentity,
      name: 'user',
      ttl: '30m',
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const participantToken = await at.toJwt();

    const dispatchClient = new AgentDispatchClient(LIVEKIT_URL, API_KEY, API_SECRET);
    await dispatchClient.createDispatch(roomName, agentName, {
      metadata: JSON.stringify({ source: 'virex-website' }),
    });

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken,
      participantName: 'user',
    };
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error(error);
    // prettier-ignore
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal error',
      { status: 500 }
    );
  }
}
