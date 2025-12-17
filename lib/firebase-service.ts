import { db } from "./firebase"
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy
} from "firebase/firestore"

export interface TimeLog {
  id: string
  userId: string
  type: "clock-in" | "clock-out"
  timestamp: string
  locationId: string
  latitude?: number
  longitude?: number
}

export interface TimeLogData {
  userId: string
  type: "clock-in" | "clock-out"
  timestamp: string
  locationId: string
  latitude?: number
  longitude?: number
}

/**
 * Log time entry to Firestore
 */
export async function logTime(
  userId: string,
  type: "clock-in" | "clock-out",
  locationId: string,
  latitude?: number,
  longitude?: number
): Promise<TimeLog> {
  const timeLogData: TimeLogData = {
    userId,
    type,
    timestamp: new Date().toISOString(),
    locationId,
    latitude,
    longitude
  }

  try {
    const docRef = await addDoc(collection(db, "time_logs"), timeLogData)
    console.log("Time log created with ID: ", docRef.id)
    return {
      id: docRef.id,
      ...timeLogData
    }
  } catch (e) {
    console.error("Error adding document: ", e)
    throw e
  }
}

/**
 * Fetch all time logs for a specific user
 */
export async function getUserTimeLogs(userId: string): Promise<TimeLog[]> {
  const q = query(
    collection(db, "time_logs"),
    where("userId", "==", userId),
    orderBy("timestamp", "desc")
  )

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TimeLog))
}

/**
 * Fetch time logs within a date range (optional location filter)
 */
export async function getTimeLogsInRange(
  fromDate: Date,
  toDate: Date,
  locationId?: string
): Promise<TimeLog[]> {
  let q = query(
    collection(db, "time_logs"),
    where("timestamp", ">=", fromDate.toISOString()),
    where("timestamp", "<=", toDate.toISOString()),
    orderBy("timestamp", "desc")
  )

  if (locationId) {
    // Note: This requires a composite index in Firestore
    q = query(
      collection(db, "time_logs"),
      where("locationId", "==", locationId),
      where("timestamp", ">=", fromDate.toISOString()),
      where("timestamp", "<=", toDate.toISOString()),
      orderBy("timestamp", "desc")
    )
  }

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TimeLog))
}

/**
 * Fetch time logs for specific user within date range
 */
export async function getUserTimeLogsInRange(
  userId: string,
  fromDate: Date,
  toDate: Date
): Promise<TimeLog[]> {
  const q = query(
    collection(db, "time_logs"),
    where("userId", "==", userId),
    where("timestamp", ">=", fromDate.toISOString()),
    where("timestamp", "<=", toDate.toISOString()),
    orderBy("timestamp", "desc")
  )

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TimeLog))
}
