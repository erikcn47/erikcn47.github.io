// Módulo de almacenamiento local -> Firebase Firestore

// Importamos Firebase desde el CDN oficial
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBxvFsRhfNNCwYwHRmuO98dhjIBDzQnxAM",
  authDomain: "lista-de-tareas-4ca70.firebaseapp.com",
  projectId: "lista-de-tareas-4ca70",
  storageBucket: "lista-de-tareas-4ca70.firebasestorage.app",
  messagingSenderId: "747970631982",
  appId: "1:747970631982:web:fe3f498ae7dcac8a3d02bf",
  measurementId: "G-P94NJB4WR6"
};

// Inicializamos Firebase, Analytics y Firestore
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

export async function loginWithGoogle() {
  await signInWithPopup(auth, googleProvider);
}

export async function logout() {
  await signOut(auth);
}

export function getCurrentUser() {
  return currentUser;
}


const DEFAULT_SETTINGS = {
  clientId: '',
  theme: 'dark',
  calendarEnabled: false,
  calendarName: 'primary'
};

/**
 * Obtener la lista de tareas guardadas desde Firestore.
 * @returns {Promise<Array>} Array de tareas.
 */
export async function getTasks() {
  if (!currentUser) return [];
  const querySnapshot = await getDocs(collection(db, "users", currentUser.uid, "tasks"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Agregar una nueva tarea a Firestore.
 * @param {Object} taskData - Datos de la tarea a agregar.
 * @returns {Promise<Object>} La tarea creada con su ID.
 */
export async function addTask(taskData) {
  const newTask = {
    title: taskData.title,
    description: taskData.description || '',
    date: taskData.date, // Formato YYYY-MM-DD
    time: taskData.time || '', // Formato HH:MM o vacío
    category: taskData.category || 'Personal',
    completed: false,
    googleEventId: taskData.googleEventId || null,
    synced: !!taskData.googleEventId,
    createdAt: new Date().toISOString()
  };
  
  if (!currentUser) throw new Error("Debes iniciar sesión");
  const docRef = await addDoc(collection(db, "users", currentUser.uid, "tasks"), newTask);
  return { id: docRef.id, ...newTask };
}

/**
 * Actualizar una tarea existente en Firestore.
 * @param {Object} updatedTask - Tarea con los cambios aplicados.
 * @returns {Promise<boolean>} True si se actualizó correctamente.
 */
export async function updateTask(updatedTask) {
  const { id, ...dataToUpdate } = updatedTask;
  if (!currentUser) throw new Error("Debes iniciar sesión");
  const taskRef = doc(db, "users", currentUser.uid, "tasks", id);
  await updateDoc(taskRef, dataToUpdate);
  return true;
}

/**
 * Eliminar una tarea por su ID en Firestore.
 * @param {string} taskId - ID de la tarea a eliminar.
 * @returns {Promise<Object>} Objeto indicando el ID eliminado.
 */
export async function deleteTask(taskId) {
  if (!currentUser) throw new Error("Debes iniciar sesión");
  await deleteDoc(doc(db, "users", currentUser.uid, "tasks", taskId));
  return { id: taskId };
}

/**
 * Obtener la configuración de la aplicación desde Firestore.
 * @returns {Promise<Object>} Configuración actual.
 */
export async function getSettings() {
  if (!currentUser) return { ...DEFAULT_SETTINGS };
  const docRef = doc(db, "users", currentUser.uid, "settings", "user_prefs");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { ...DEFAULT_SETTINGS, ...docSnap.data() };
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Guardar la configuración de la aplicación en Firestore.
 * @param {Object} settings - Nueva configuración.
 */
export async function saveSettings(settings) {
  const currentSettings = await getSettings();
  if (!currentUser) return;
  await setDoc(doc(db, "users", currentUser.uid, "settings", "user_prefs"), { ...currentSettings, ...settings });
}