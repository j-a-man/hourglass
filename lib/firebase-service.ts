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
  employeeId: string
  userName?: string
  clockInTime: string
  clockOutTime?: string | null
  locationId: string
  latitude?: number
  longitude?: number
  organizationId?: string
}

export interface TimeLogData {
  employeeId: string
  userName?: string
  clockInTime: string
  clockOutTime?: string | null
  locationId: string
  latitude?: number
  longitude?: number
  organizationId: string
}

/**
 * Log time entry to Firestore (Active Session Model)
 */
export async function logTime(
  organizationId: string,
  employeeId: string,
  userName: string,
  locationId: string,
  latitude?: number,
  longitude?: number
): Promise<TimeLog> {
  const timeLogData: TimeLogData = {
    employeeId,
    userName,
    clockInTime: new Date().toISOString(),
    clockOutTime: null,
    locationId,
    latitude,
    longitude,
    organizationId
  }

  try {
    const docRef = await addDoc(collection(db, "organizations", organizationId, "time_entries"), timeLogData)
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
export async function getUserTimeLogs(organizationId: string, employeeId: string): Promise<TimeLog[]> {
  const q = query(
    collection(db, "organizations", organizationId, "time_entries"),
    where("employeeId", "==", employeeId),
    orderBy("clockInTime", "desc")
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
  organizationId: string,
  fromDate: Date,
  toDate: Date,
  locationId?: string
): Promise<TimeLog[]> {
  let q = query(
    collection(db, "organizations", organizationId, "time_entries"),
    where("clockInTime", ">=", fromDate.toISOString()),
    where("clockInTime", "<=", toDate.toISOString()),
    orderBy("clockInTime", "desc")
  )

  if (locationId) {
    q = query(
      collection(db, "organizations", organizationId, "time_entries"),
      where("locationId", "==", locationId),
      where("clockInTime", ">=", fromDate.toISOString()),
      where("clockInTime", "<=", toDate.toISOString()),
      orderBy("clockInTime", "desc")
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
  organizationId: string,
  employeeId: string,
  fromDate: Date,
  toDate: Date
): Promise<TimeLog[]> {
  const q = query(
    collection(db, "organizations", organizationId, "time_entries"),
    where("employeeId", "==", employeeId),
    where("clockInTime", ">=", fromDate.toISOString()),
    where("clockInTime", "<=", toDate.toISOString()),
    orderBy("clockInTime", "desc")
  )

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TimeLog))
}
