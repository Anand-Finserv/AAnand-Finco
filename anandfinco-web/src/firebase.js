// src/firebase.js
// ─────────────────────────────────────────────────────────────────────
//  HOW TO FILL THIS FILE:
//  1. Go to console.firebase.google.com → your project
//  2. Click Settings gear ⚙ → Project Settings
//  3. Scroll to "Your apps" → click Web app (</>)
//  4. Copy each value from the firebaseConfig shown there
// ─────────────────────────────────────────────────────────────────────
import { initializeApp }              from 'firebase/app'
import { getAuth }                    from 'firebase/auth'
import { getFirestore }               from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            "AIzaSyAYfHtkJ0sPCwjrES8UVwJk8wNttNyPFv0",
  authDomain:        "anand-finco-web.firebaseapp.com",
  projectId:         "anand-finco-web",
  storageBucket:     "anand-finco-web.firebasestorage.app",
  messagingSenderId: "46558038054",
  appId:             "1:46558038054:web:7e8cd0e8a8b666b664bee7",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getFirestore(app)
export default app
