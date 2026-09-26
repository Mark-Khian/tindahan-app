import { initializeApp } from 'firebase/app'
import { browserLocalPersistence, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { firebaseConfig } from './firebaseConfig'

export const app = initializeApp(firebaseConfig)

// Local persistence so the session survives app restarts (IndexedDB first, localStorage fallback).
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
})

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
