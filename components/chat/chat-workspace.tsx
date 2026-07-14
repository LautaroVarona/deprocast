"use client";



import { useBabel } from "@/components/babel/babel-context";

import { MentionInput } from "@/components/chat/mention-input";

import { MessageList } from "@/components/chat/message-list";

import { ProposalCards } from "@/components/chat/proposal-cards";

import { SessionSidebar } from "@/components/chat/session-sidebar";

import type {

  ChatMessageDto,

  ChatSegment,

  ChatSessionSummary,

} from "@/lib/chat/types";

import type { ContextEventDto } from "@/lib/events/types";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";



export function ChatWorkspace() {

  const { universeSlug, universeFetch, isLoading: isUniverseLoading } = useBabel();

  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);

  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [isSending, setIsSending] = useState(false);

  const [pendingProposals, setPendingProposals] = useState<ContextEventDto[]>(

    [],

  );



  const fetchSessions = useCallback(async () => {

    setIsLoadingSessions(true);

    try {

      const response = await universeFetch("/api/chat/sessions");

      const data = await response.json();

      if (!response.ok) {

        throw new Error(data.error ?? "No se pudieron cargar las sesiones");

      }

      setSessions(data.sessions ?? []);

      return data.sessions as ChatSessionSummary[];

    } catch (error) {

      const message =

        error instanceof Error

          ? error.message

          : "No se pudieron cargar las sesiones";

      toast.error(message);

      return [];

    } finally {

      setIsLoadingSessions(false);

    }

  }, [universeFetch]);



  const fetchMessages = useCallback(async (sessionId: string) => {

    setIsLoadingMessages(true);

    try {

      const response = await universeFetch(

        `/api/chat/sessions/${sessionId}/messages`,

      );

      const data = await response.json();

      if (!response.ok) {

        throw new Error(data.error ?? "No se pudieron cargar los mensajes");

      }

      setMessages(data.messages ?? []);

    } catch (error) {

      const message =

        error instanceof Error

          ? error.message

          : "No se pudieron cargar los mensajes";

      toast.error(message);

      setMessages([]);

    } finally {

      setIsLoadingMessages(false);

    }

  }, [universeFetch]);



  useEffect(() => {

    setSessions([]);

    setActiveSessionId(null);

    setMessages([]);

    setPendingProposals([]);

  }, [universeSlug]);



  useEffect(() => {

    if (isUniverseLoading) return;



    void (async () => {

      const loaded = await fetchSessions();

      if (loaded.length > 0) {

        setActiveSessionId(loaded[0].id);

        return;

      }



      try {

        const response = await universeFetch("/api/chat/sessions", {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({}),

        });

        const data = await response.json();

        if (response.ok && data.session) {

          const session = data.session as ChatSessionSummary;

          setSessions([session]);

          setActiveSessionId(session.id);

        }

      } catch {

        // El usuario puede crear una sesión manualmente desde el sidebar.

      }

    })();

  }, [fetchSessions, universeSlug, isUniverseLoading, universeFetch]);



  useEffect(() => {

    if (!activeSessionId) {

      setMessages([]);

      return;

    }

    void fetchMessages(activeSessionId);

  }, [activeSessionId, fetchMessages]);



  const handleCreateSession = async () => {

    try {

      const response = await universeFetch("/api/chat/sessions", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({}),

      });

      const data = await response.json();

      if (!response.ok) {

        throw new Error(data.error ?? "No se pudo crear la sesión");

      }

      const session = data.session as ChatSessionSummary;

      setSessions((current) => [session, ...current]);

      setActiveSessionId(session.id);

      setMessages([]);

      toast.success("Nueva conversación creada");

    } catch (error) {

      const message =

        error instanceof Error

          ? error.message

          : "No se pudo crear la sesión";

      toast.error(message);

    }

  };



  const handleDeleteSession = async (sessionId: string) => {

    try {

      const response = await universeFetch(`/api/chat/sessions/${sessionId}`, {

        method: "DELETE",

      });

      const data = await response.json();

      if (!response.ok) {

        throw new Error(data.error ?? "No se pudo eliminar la sesión");

      }



      const remaining = sessions.filter((session) => session.id !== sessionId);

      setSessions(remaining);



      if (activeSessionId === sessionId) {

        setActiveSessionId(remaining[0]?.id ?? null);

        if (!remaining[0]) setMessages([]);

      }



      toast.success("Conversación eliminada");

    } catch (error) {

      const message =

        error instanceof Error

          ? error.message

          : "No se pudo eliminar la sesión";

      toast.error(message);

    }

  };



  const handleSend = async (segments: ChatSegment[]) => {

    if (!activeSessionId) {

      toast.error("Creá o seleccioná una conversación primero");

      return;

    }



    setIsSending(true);

    try {

      const response = await universeFetch("/api/chat/send", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          sessionId: activeSessionId,

          segments,

        }),

      });

      const data = await response.json();

      if (!response.ok) {

        throw new Error(data.error ?? "No se pudo enviar el mensaje");

      }



      setMessages((current) => [

        ...current,

        data.userMessage,

        data.assistantMessage,

      ]);



      if (Array.isArray(data.proposals) && data.proposals.length > 0) {

        setPendingProposals(data.proposals as ContextEventDto[]);

      } else {

        setPendingProposals([]);

      }



      setSessions((current) =>

        current

          .map((session) =>

            session.id === activeSessionId

              ? {

                  ...session,

                  messageCount: session.messageCount + 2,

                  updatedAt: data.assistantMessage.createdAt,

                  title:

                    session.messageCount === 0

                      ? data.userMessage.content.slice(0, 60)

                      : session.title,

                }

              : session,

          )

          .sort(

            (a, b) =>

              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),

          ),

      );

    } catch (error) {

      const message =

        error instanceof Error

          ? error.message

          : "No se pudo enviar el mensaje";

      toast.error(message);

    } finally {

      setIsSending(false);

    }

  };



  return (

    <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden">

      <SessionSidebar

        sessions={sessions}

        activeSessionId={activeSessionId}

        isLoading={isLoadingSessions}

        onSelect={setActiveSessionId}

        onCreate={() => void handleCreateSession()}

        onDelete={(sessionId) => void handleDeleteSession(sessionId)}

      />



      <div className="flex min-w-0 flex-1 flex-col">

        <div className="border-b border-border px-4 py-3">

          <h1 className="text-sm font-semibold">Chat Exocórtex</h1>

          <p className="font-mono text-[10px] text-muted-foreground">

            Contexto relacional con @menciones · Cohere

          </p>

        </div>



        <MessageList

          messages={messages}

          isLoading={isLoadingMessages || isSending}

        />



        <ProposalCards

          events={pendingProposals}

          onResolved={() => setPendingProposals([])}

        />



        <MentionInput

          disabled={!activeSessionId || isSending}

          onSend={(segments) => void handleSend(segments)}

        />

      </div>

    </div>

  );

}


