"use client"

import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot, orderBy, addDoc, doc, updateDoc, serverTimestamp, getDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Send, User, CheckCircle2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/components/auth-context"

interface Message {
    senderId: string
    senderName: string
    content: string
    createdAt: any // Timestamp
}

interface Thread {
    id: string
    participants: string[]
    participantDetails: { [uid: string]: { name: string, email: string } }
    messages: Message[]
    lastUpdated: any
    readBy: string[]
}

export function NotificationInbox({ userId, userEmail, userName }: { userId: string, userEmail?: string, userName?: string }) {
    const { userData } = useAuth()
    const [threads, setThreads] = useState<Thread[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
    const [replyText, setReplyText] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(true)

    // Listen for threads where user is a participant
    useEffect(() => {
        if (!userId || !userData?.organizationId) return
        const orgId = userData.organizationId

        const q = query(
            collection(db, "organizations", orgId, "notifications"),
            where("participants", "array-contains", userId),
            orderBy("lastUpdated", "desc")
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedThreads = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Thread[]

            setThreads(fetchedThreads)

            // Calc unread
            const unread = fetchedThreads.filter(t => !t.readBy.includes(userId)).length
            setUnreadCount(unread)
            setLoading(false)

            // Update selected thread if it exists (for live chat)
            if (selectedThread) {
                const updated = fetchedThreads.find(t => t.id === selectedThread.id)
                if (updated) setSelectedThread(updated)
            }
        })

        return () => unsubscribe()
    }, [userId, selectedThread])

    const handleReadThread = async (thread: Thread) => {
        if (!userData?.organizationId) return
        const orgId = userData.organizationId

        setSelectedThread(thread)
        if (!thread.readBy.includes(userId)) {
            // Mark as read
            const ref = doc(db, "organizations", orgId, "notifications", thread.id)
            await updateDoc(ref, {
                readBy: [...thread.readBy, userId]
            })
        }
    }

    const handleReply = async () => {
        if (!selectedThread || !replyText.trim() || !userData?.organizationId) return
        const orgId = userData.organizationId

        try {
            const newMessage: Message = {
                senderId: userId,
                senderName: userName || userEmail || "User",
                content: replyText,
                createdAt: Timestamp.now()
            }

            const ref = doc(db, "organizations", orgId, "notifications", selectedThread.id)

            // 1. Add message to array
            // 2. Update lastUpdated
            // 3. Reset readBy to JUST the sender (so others see it as unread)
            await updateDoc(ref, {
                messages: [...selectedThread.messages, newMessage],
                lastUpdated: serverTimestamp(),
                readBy: [userId]
            })

            setReplyText("")
        } catch (error) {
            console.error("Reply failed:", error)
        }
    }

    const otherParticipantName = (thread: Thread) => {
        // Find a participant that isn't me
        // This logic works for 1:1. For group, might need adjustment.
        const otherId = thread.participants.find(p => p !== userId)
        if (otherId && thread.participantDetails && thread.participantDetails[otherId]) {
            return thread.participantDetails[otherId].name
        }
        return "Unknown"
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <button className="relative h-10 w-10 flex items-center justify-center glass-nav bg-white/40 hover:bg-white transition-colors">
                    <Bell size={20} className="text-slate-600" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border border-white animate-pulse" />
                    )}
                </button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0 gap-0">
                <SheetHeader className="p-6 border-b bg-white">
                    <SheetTitle className="flex items-center gap-2">
                        <Bell className="text-indigo-600" />
                        Notifications
                        {unreadCount > 0 && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                    </SheetTitle>
                </SheetHeader>

                {selectedThread ? (
                    // --- THREAD VIEW ---
                    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
                        {/* Header */}
                        <div className="p-3 border-b bg-white flex items-center justify-between shadow-sm z-10">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedThread(null)}>
                                ← Back
                            </Button>
                            <span className="font-bold text-slate-700">{otherParticipantName(selectedThread)}</span>
                            <div className="w-10" />
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {selectedThread.messages.map((msg, i) => {
                                    const isMe = msg.senderId === userId
                                    return (
                                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe
                                                ? 'bg-indigo-600 text-white rounded-br-none'
                                                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                                                }`}>
                                                <p>{msg.content}</p>
                                                <p className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                    {msg.createdAt?.seconds ? formatDistanceToNow(new Date(msg.createdAt.seconds * 1000), { addSuffix: true }) : "Just now"}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>

                        {/* Input */}
                        <div className="p-4 bg-white border-t flex gap-2">
                            <Input
                                placeholder="Type a reply..."
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleReply()}
                            />
                            <Button size="icon" onClick={handleReply} disabled={!replyText.trim()} className="bg-indigo-600">
                                <Send size={16} />
                            </Button>
                        </div>
                    </div>
                ) : (
                    // --- INBOX LIST VIEW ---
                    <ScrollArea className="flex-1 bg-slate-50/50">
                        {threads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                                <Bell className="h-10 w-10 mb-2 opacity-20" />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {threads.map(thread => {
                                    const isUnread = !thread.readBy.includes(userId)
                                    const lastMsg = thread.messages[thread.messages.length - 1]
                                    return (
                                        <button
                                            key={thread.id}
                                            onClick={() => handleReadThread(thread)}
                                            className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex gap-3 ${isUnread ? 'bg-white' : 'bg-transparent'}`}
                                        >
                                            <Avatar>
                                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${otherParticipantName(thread)}`} />
                                                <AvatarFallback><User /></AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <h4 className={`text-sm ${isUnread ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                                                        {otherParticipantName(thread)}
                                                    </h4>
                                                    {isUnread && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                                                </div>
                                                <p className={`text-xs truncate ${isUnread ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                                                    {lastMsg?.content || "No messages"}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    {lastMsg?.createdAt?.seconds ? formatDistanceToNow(new Date(lastMsg.createdAt.seconds * 1000), { addSuffix: true }) : ""}
                                                </p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </ScrollArea>
                )}
            </SheetContent>
        </Sheet>
    )
}
