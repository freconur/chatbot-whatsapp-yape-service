const { createBot, createProvider, createFlow, addKeyword, addAnswer, EVENTS } = require('@bot-whatsapp/bot')
const QRPortalWeb = require('@bot-whatsapp/portal')
const axios = require('axios')
const puppeteer = require('puppeteer')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const { getJustOneName } = require('./utils/getJustOneNome')
const fs = require('fs').promises;
const { dateConvertObject } = require('./date')
const cron = require('node-cron')
const cloudinary = require('cloudinary');
const { db } = require('./firebase.config')

cloudinary.config({
	cloud_name: 'dd8zkxkxw',
	api_key: '694431866629728',
	api_secret: '3583PdL1-1qSnBm5laiTKtQgDBY'
});

const URL_API = "https://script.google.com/macros/s/AKfycbxBvwKzGqbquehk_A7t_AurdzK3ki49ujvXGRlJsNHPh9t4lmLQeWGb6Nz42m9XSgk1/exec"
const zapatillasRta = () => {
	const zapatillas = [
		{
			sku: "101",
			nombre: "zapatillas b190 running pro",
			image: "",
			precio: "189.90",
			color: 'rojo, azul, negro, verde'
		},
		{
			sku: "102",
			nombre: "zapatillas adidas running superlight",
			image: "",
			precio: "210.90",
			color: 'azul, negro'
		},
		{
			sku: "103",
			nombre: "zapatillas nike hyper hightlight",
			image: "",
			precio: "340",
			color: 'azul, negro, morado'
		},
	]
	console.log('zapatillas', zapatillas)
	return zapatillas?.map((m, index) => ({ body: [`${index + 1}-  sku: ${m.sku}, descripcion: *${m.nombre}*, precio: ${m.precio}`].join('\n') }))
}
const zapatosRta = () => {
	const zapatillas = [
		{
			sku: "104",
			nombre: "zapatos b190 running pro",
			image: "",
			precio: "189.90"
		},
		{
			sku: "105",
			nombre: "zapatos adidas running superlight",
			image: "",
			precio: "265.90"
		},
		{
			sku: "106",
			nombre: "zapatos nike hyper hightlight",
			image: "",
			precio: "489.90"
		},
	]
	console.log('zapatillas', zapatillas)
	return zapatillas?.map((m, index) => ({ body: [`${index + 1}-  sku: ${m.sku} descripcion:*${m.nombre}* precio: ${m.precio}`].join('\n') }))
}
const flujoPagoVerificacion = addKeyword('verificar', 'verificacion')
	.addAnswer('escribe el numero de *DNI* con el que se realizo el pago del yape para la verificación', { capture: true }, async (ctx, { state, flowDynamic, fallBack, gotoFlow }) => {
		await state.update({ estadoDeVerificacion: true })
		//tengo que capturar el mensaje escrito
		let dniDePagoDeYape
		let nomComPagoYape
		let nomComPagoPlin
		let lastnameYape
		let firstname
		const dni = ctx.body
		const regex = /^[0-9]*$/;
		const onlyNumbers = regex.test(dni)
		if (dni.length === 8 && onlyNumbers) {
			/////////////////FUNCION PARA ELIMINAR LA IMAGEN ////////////////////
			const deleteImage = async (filePath) => {
				try {
					await fs.unlink(filePath);
					console.log(`File ${filePath} has been deleted.`);
				} catch (err) {
					console.error(err);
				}
			}
			/////////////////FUNCION PARA ELIMINAR LA IMAGEN ////////////////////

			await flowDynamic('Estamos verificando tus datos, te responderemos en un minuto ⏱️......')

			try {
				axios
					.get(`https://dniruc.apisperu.com/api/v1/dni/${dni}?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImZyZWNvZGV2LjE5OTJAZ21haWwuY29tIn0.xrjtMFR4j9zyTCzwaQExIo7HYplXEBJOA188kXJkeH4`)
					.then(response => {
						dniDePagoDeYape = response
					})
					.then(async r => {
						if (dniDePagoDeYape) {
							nomComPagoYape = `${dniDePagoDeYape.data.nombres} ${dniDePagoDeYape.data.apellidoPaterno} ${dniDePagoDeYape.data.apellidoMaterno}`
							nomComPagoPlin = getJustOneName(dniDePagoDeYape.data.nombres)
							lastnameYape = dniDePagoDeYape.data.apellidoPaterno
							firstname = dniDePagoDeYape.data.apellidoMaterno
						}
					})

			} catch (error) {
				console.log('error:', error)
			}
			try {
				axios
					.post(`${URL_API}`,
						{
							op: "listar"
						}
					)
					.then(async response => {
						//primero deberia filtar por fecha y hora y despues seguir con el nombre
						const listaDeYapes = await response?.data.content
						console.log('listaDeYapes', listaDeYapes)
						if (listaDeYapes) {
							listaDeYapes.map(async yape => {
								const nombre = yape.mensaje.slice(6, -26)
								if (nombre?.toLowerCase() === nomComPagoYape?.toLowerCase()) {//en esta validacion tambien se pondra el monto
									await state.update({ estadoDeVerificacion: false })
									/////////////////////////////////////firebase update subscription//////////////////////////////////
									const subscriptionRef = db.collection("customers").doc(`${state.getMyState()?.dniUsuario}`)
									subscriptionRef.get().then(async user => {
										if (user.exists) {
											subscriptionRef.update({
												subscription: true,
												dateSubscription: new Date(),
												// timesSubscripted: db.firestore.FieldValue.increment(1)
												returningCustomer: true
												// timesSubscripted: firebase.firestore.FieldValue.increment(1)
											})

											const browser = await puppeteer.launch({
												headless: true
											})
											const page = await browser.newPage()
											await page.goto(`https://chatbot-yape-miguel.vercel.app/customers/${state.getMyState().dniUsuario}`,
												// {
												// 	waitUntil: "load",
												// }
											)
											await new Promise(r => setTimeout(r, 3000))
											await page.screenshot({ path: `${dni}.png` })
											await browser.close()

											cloudinary.uploader
												.upload(`${dni}.png`)
												.then(async result => {
													await state.update({ urlImage: result.url })
													const urlimage = result.url
													if (urlimage) {
														await flowDynamic([
															{
																body: 'Gracias por tu compra. Que tengas un buen día',
																media: `${urlimage}`,
																// delay: 2000
															}
														])
														deleteImage(`${dni}.png`)
													}
												})
										}
									})
									/////////////////////////////////////firebase update subscription//////////////////////////////////

								} else if (nombre?.toLowerCase() === `${nomComPagoPlin?.toLowerCase()} ${lastnameYape?.toLowerCase()}`) {
									await state.update({ estadoDeVerificacion: false })
									await flowDynamic('en un momento se te entregara tu producto plin')
									const subscriptionRef = db.collection("customers").doc(`${state.getMyState()?.dniUsuario}`)
									subscriptionRef.get().then(async user => {
										if (user.exists) {
											subscriptionRef.update({
												subscription: true,
												dateSubscription: new Date(),
												// timesSubscripted: db.firestore.FieldValue.increment(1)
												returningCustomer: true
												// timesSubscripted: firebase.firestore.FieldValue.increment(1)
											})

											const browser = await puppeteer.launch({
												headless: true
											})
											const page = await browser.newPage()
											await page.goto(`https://chatbot-yape-miguel.vercel.app/customers/${state.getMyState().dniUsuario}`,
												// {
												// 	waitUntil: "load",
												// }
											)
											await new Promise(r => setTimeout(r, 3000))
											await page.screenshot({ path: `${dni}.png` })
											await browser.close()

											cloudinary.uploader
												.upload(`${dni}.png`)
												.then(async result => {
													await state.update({ urlImage: result.url })
													const urlimage = result.url
													if (urlimage) {
														await flowDynamic([
															{
																body: 'Gracias por tu compra. Que tengas un buen día',
																media: `${urlimage}`,
																// delay: 2000
															}
														])
														deleteImage(`${dni}.png`)
													}
												})
										}
									})
									
								}
							})
						}
					}).
					then(async r => {
						if(state.getMyState().estadoDeVerificacion) await flowDynamic('Upps!, parece que hubo algun problema con la verificacion del pago, intenta nuevamente, escribe *VERIFICAR*')
					})
			} catch (error) {

			}
		}
	})

const flujoPagoRenovar = addKeyword(EVENTS.ACTION)
	.addAnswer(['Realiza el pago de *yape* de *S/5.00*, para suscribirte', '*Numero*: 982752688', '*Titular*:FRANCO ERNESTO CONDORI HUARAYA', 'Para verificar el pago ecribe *VERIFICAR*']
	)

const flujoPago = addKeyword('si')
	.addAnswer(['Realiza el pago de *yape* de *S/5.00* para suscribirte.', '*Numero*: 982752688', '*Titular*:FRANCO ERNESTO CONDORI HUARAYA', 'Para verificar el pago ecribe *VERIFICAR*']
	)

const flujoInteresado = addKeyword('si')
	.addAnswer(['Estas interesado en nuestro producto?, escribe *SI* para continuar.'], null, null, flujoPago)

const flujoInteresadoYacliente = addKeyword('si')
	.addAnswer(['Quieres seguir renovar tu suscripción?, escribe *SI* para continuar.'], null, null, flujoPago)

const flujoTips = addKeyword('tips')
	.addAnswer('En un minuto te enviaremos los tips', null, async (ctx, { flowDynamic, state, fallBack, gotoFlow }) => {
		let dataUser
		const number = ctx.from.slice(2)
		const subscriptionRef = db.collection("customers");
		subscriptionRef.where("numberMobile", "==", number)
			.get()
			.then(async (querySnapshot) => {
				querySnapshot.forEach((doc) => {
					// customersActiveSubscription.push({ ...doc.data(), id: doc.id })
					dataUser = { ...doc.data(), id: doc.id }
					// console.log('dataUser', dataUser)
				});

				if (dataUser?.id) {
					const browser = await puppeteer.launch({
						headless: true
					})
					const page = await browser.newPage()
					await page.goto(`https://chatbot-yape-miguel.vercel.app/customers/${dataUser.id}`,
						// {
						// 	waitUntil: "load",
						// }
					)
					await new Promise(r => setTimeout(r, 3000))
					await page.screenshot({ path: `${dataUser.id}.png` })
					await browser.close()

					cloudinary.uploader
						.upload(`${dataUser.id}.png`)
						.then(async result => {
							await state.update({ urlImage: result.url })
							const urlimage = result.url
							if (urlimage) {
								await flowDynamic([
									{
										body: 'Gracias por tu compra. Que tengas un buen día',
										media: `${urlimage}`,
									}
								])
								deleteImage(`${dataUser.id}.png`)
							}
						})
					const userRef = db.collection("customers").doc(`${dataUser?.id}`);
					return userRef.update({
						subscription: false,
					})
				} else {
					await flowDynamic('Tu subscripcion a terminado, renueva o registrate para tener los beneficios')
					return gotoFlow(flujoPagoRenovar)
				}

			})
	})

const flujoBienvenida2 = addKeyword('_')
	.addAnswer('cual es tu numero de dni', { capture: true },
		async (ctx, { flowDynamic, state, fallBack, gotoFlow }) => {
			let rta
			const dni = ctx.body
			console.log('ctx', ctx)
			const regex = /^[0-9]*$/;
			const onlyNumbers = regex.test(dni)
			if (dni.length === 8 && onlyNumbers) {
				const docRef = db.collection("customers").doc(`${dni}`);

				docRef.get().then(async (doc) => {
					if (doc.exists) {
						docRef.update({numberMobile: ctx.from.slice(2)})
						await state.update({ dniUsuario: dni })
						await flowDynamic(`Hola *${doc.data().name.toUpperCase()} ${doc.data().lastname.toUpperCase()} ${doc.data().firstname.toUpperCase()}*, un gusto saludarte de nuevo!`)
						return gotoFlow(flujoInteresadoYacliente)
					} else {
						try {
							axios
								.get(`https://dniruc.apisperu.com/api/v1/dni/${dni}?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImZyZWNvZGV2LjE5OTJAZ21haWwuY29tIn0.xrjtMFR4j9zyTCzwaQExIo7HYplXEBJOA188kXJkeH4`)
								.then(response => {
									rta = response
								})
								.then(async r => {
									if (rta) {
										db.collection("customers").doc(`${dni}`).set({
											name: rta.data.nombres.toLowerCase(),
											lastname: rta.data.apellidoPaterno.toLowerCase(),
											firstname: rta.data.apellidoMaterno.toLowerCase(),
											numberMobile: ctx.from.slice(2),
											subscription: false,
											dateOfSubscription: new Date()
										});
										await state.update({ dataUser: rta })
										await state.update({ dniUsuario: dni })
										await state.update({ nombreCompleto: `${rta.data.nombres} ${rta.data.apellidoPaterno} ${rta.data.apellidoMaterno}` })
										await state.update({ nombre: getJustOneName(rta.data.nombres) })
										await state.update({ apellidoPaterno: rta.data.apellidoPaterno })
										await state.update({ apellidoPaterno: rta.data.apellidoMaterno })
									}
								})
						} catch (err) {
							console.log("Error getting document:", error);
						}
						await flowDynamic(`Hola *${state.getMyState()?.nombreCompleto}*`)
						return gotoFlow(flujoInteresado)
					}
				}).catch((error) => {
					console.log("Error getting document:", error);
				});

			} else {
				await flowDynamic('Ingresa un dni valido')
				return fallBack()
			}

		})

// cronSchudle()
const main = async () => {
	const adapterDB = new MockAdapter()
	const adapterFlow = createFlow([flujoBienvenida2, flujoPagoVerificacion, flujoTips])
	const adapterProvider = createProvider(BaileysProvider)

	createBot({
		flow: adapterFlow,
		provider: adapterProvider,
		database: adapterDB,
	})

	QRPortalWeb()
	cron.schedule('*/1 * * * *', async () => {
		console.log('hemos entrado')
		const customersActiveSubscription = []
		const customerSubscriptionActive = db.collection("customers");
		// Create a query against the collection.
		customerSubscriptionActive.where("subscription", "==", true)
			.get()
			.then((querySnapshot) => {
				querySnapshot.forEach((doc) => {
					customersActiveSubscription.push({ ...doc.data(), id: doc.id })
				});
			})
			.then(async r => {
				const currentlyDate = new Date()

				await Promise.all(customersActiveSubscription?.map(async user => {
					const data = new Date(user.dateSubscription._seconds * 1000)
					const rtaDate = dateConvertObject(new Date(data?.setDate(data?.getDate() + 15)))
					if (currentlyDate && rtaDate) {
						if (rtaDate.date === currentlyDate.getDate() && rtaDate.month === currentlyDate.getMonth() && rtaDate.year === currentlyDate.getFullYear()) {
							await adapterProvider.sendMessage(`51${user.numberMobile}`,
								`Hola *${user.name.toUpperCase()} ${user.lastname.toUpperCase()} ${user.firstname.toUpperCase()}*, tienes nuevos tips pendientes por aprender, escribe *TIPS* para enviartelos.`, {})
							// await utils.delay(3000)
						}
					}
				}))
			})
			.catch((error) => {
				console.log("Error getting documents: ", error);
			})
	});
}

main()
