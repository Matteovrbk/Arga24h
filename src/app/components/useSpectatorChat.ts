import { useState, useEffect, useCallback } from "react";
import { db } from "../lib/firebase";
import { ref, push, onValue, query, limitToLast, remove, child, set } from "firebase/database";

export interface ChatMessage {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

const CHAT_PATH = "sp51/chat";
const SUSPENDED_PATH = "sp51/chatSuspended";
const MAX_MESSAGES = 50;

export function useSpectatorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suspended, setSuspendedState] = useState(false);

  useEffect(() => {
    if (!db) return;
    const chatRef = query(ref(db, CHAT_PATH), limitToLast(MAX_MESSAGES));
    const unsub = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setMessages([]); return; }
      const list: ChatMessage[] = Object.entries(data).map(([id, val]) => ({
        id,
        ...(val as Omit<ChatMessage, "id">),
      }));
      list.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsub = onValue(ref(db, SUSPENDED_PATH), (snapshot) => {
      setSuspendedState(!!snapshot.val());
    });
    return () => unsub();
  }, []);

  const setSuspended = useCallback((value: boolean) => {
    if (!db) return;
    set(ref(db, SUSPENDED_PATH), value);
  }, []);

  const sendMessage = useCallback((text: string, author: string) => {
    if (!db || !text.trim() || suspended) return;
    push(ref(db, CHAT_PATH), {
      text: text.trim().slice(0, 200),
      author: author.trim().slice(0, 30) || "Spectateur",
      timestamp: Date.now(),
    });
  }, [suspended]);

  const deleteMessage = useCallback((messageId: string) => {
    if (!db) return;
    remove(child(ref(db, CHAT_PATH), messageId));
  }, []);

  const clearAllMessages = useCallback(() => {
    if (!db) return;
    remove(ref(db, CHAT_PATH));
  }, []);

  return { messages, sendMessage, deleteMessage, clearAllMessages, isConnected: !!db, suspended, setSuspended };
}
