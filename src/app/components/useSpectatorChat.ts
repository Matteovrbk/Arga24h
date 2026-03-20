import { useState, useEffect, useCallback } from "react";
import { db } from "../lib/firebase";
import { ref, push, onValue, query, limitToLast } from "firebase/database";

export interface ChatMessage {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

const CHAT_PATH = "sp51/chat";
const MAX_MESSAGES = 50;

export function useSpectatorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

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

  const sendMessage = useCallback((text: string, author: string) => {
    if (!db || !text.trim()) return;
    push(ref(db, CHAT_PATH), {
      text: text.trim().slice(0, 200),
      author: author.trim().slice(0, 30) || "Spectateur",
      timestamp: Date.now(),
    });
  }, []);

  return { messages, sendMessage, isConnected: !!db };
}
