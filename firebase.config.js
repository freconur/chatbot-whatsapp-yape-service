const {initializeApp, cert} = require ('firebase-admin/app')
const {getFirestore} = require ('firebase-admin/firestore')
const serviceAccount = require('./chatbot-key.json')

// Initialize Firebase

// export const app = initializeApp({credential:cert(serviceAccount)});
initializeApp({credential:cert(serviceAccount)});


const db= getFirestore()

module.exports = {db}