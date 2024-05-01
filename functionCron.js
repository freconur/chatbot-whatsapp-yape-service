const cron = require('node-cron')
const { createBot, createProvider, createFlow, addKeyword, addAnswer } = require('@bot-whatsapp/bot')
const { hoursUnixDate, dateConvertObject } = require('./date')

const { db } = require('./firebase.config')
const cronSchudle = () => {
  
  cron.schedule('25 22 * * *', () => {

    const flowTesting = addKeyword(EVENTS.ACTION).addAnswer(
      'Aqui va un mensaje',
      { capture: true },
      async (ctx, { provider }) => {
        await provider.sendImage(`51986878136@s.whatsapp.net`, 'https://res.cloudinary.com/dd8zkxkxw/image/upload/v1713561767/b9obuj6t0wvogcatdkmk.png', 'mensaje de texto')
        // el número de telefono se envía en este formato 12345678901@s.whatsapp.net
      }
    )

    // const customersActiveSubscription = []
    // const customerSubscriptionActive = db.collection("customers");
    // // Create a query against the collection.
    // customerSubscriptionActive.where("subscription", "==", true)
    //   .get()
    //   .then((querySnapshot) => {
    //     querySnapshot.forEach((doc) => {
    //       // doc.data() is never undefined for query doc snapshots
    //       customersActiveSubscription.push({ ...doc.data(), id: doc.id })
    //     });
    //   })
    //   .catch((error) => {
    //     console.log("Error getting documents: ", error);
    //   }).then(r => {
    //     const currentlyDate = new Date()
    //     customersActiveSubscription.forEach(user => {
    //       const data = new Date(user.dateSubscription._seconds * 1000)
    //       const rtaDate = dateConvertObject(new Date(data.setDate(data.getDate() + 1)))
    //       // if(rtaDate.date === currentlyDate.getDate() && rtaDate.month === currentlyDate.getMonth() && rtaDate.year === currentlyDate.getFullYear()){
    //       // }
    //       return rtaDate
    //     })
    //   })
    // console.log('query', query)
    const main = async () => {
      const adapterDB = new MockAdapter()
      const adapterFlow = createFlow([flowTesting])
      const adapterProvider = createProvider(BaileysProvider)
  
      createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
      })
  
      QRPortalWeb()
    }
  
    main()
  });
  
}

module.exports = { cronSchudle }