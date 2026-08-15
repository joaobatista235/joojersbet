const admin = require('firebase-admin');
const serviceAccount = {
  projectId: "bets-b696c",
  clientEmail: "firebase-adminsdk-fbsvc@bets-b696c.iam.gserviceaccount.com",
  privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDzSxK4FCnwNEP2\nN0WxqyWHo7YXpMeBn2i4DCrjEzvUxTsTzKfD+UWQBs8rN8smWoUN7LrjoPVHkaDa\nbfV6M29ZHvDQZrfCvAkMvcCTO5S8NLd3UitRr5RcTpdPXtM+jYtjbcLeO391OA0D\nTrhQqvr0XlBMqp3mujQXfOW+c3nsbnxZVA0rWRcwi7ziTfk2NBXTKnC59QH2CbiZ\nE94OKWJ5bpd1cbnRvAur2bfx3SRR6PSPrmW8VdwR2hFJ3TDrmmHgnFwx3cS7qa5y\nBw9YUwwydYHLQxeK3nK1q7/njq7ec0YDyrtAE+T9yTfwpKqTg+yPI8Ca9AObKr5s\nYkVh3OwpAgMBAAECggEAZIOrpCmQehDd0ydav+B5jORyIqqNUlxNo1xDi7UyjuE9\nWxy+YxTlTG/Dv5M5dwsG1Y3sWIbzTzI3RocPWAFQC33g9/i4Ctgs1PrASRPgizEs\nazujcggcP1ao5L3EgJ9x6w456B6ktgUGO0uWkp1ROQyOGF6VBfH/+4Q6VsjWonrk\n4SG/j3KmWLV/xXVuu44eSH4gXDZtZivcEqGTSULZP4dZYxRb29QRqh+NkjOxDvVQ\noyErVD/4QyCUWuN1nibdiPEhlayUB1/W4pwXVev9SHuj3V8vvp1burKo9PwLxrPW\nBJHYKd5cl47wQAF/WWvIfJu03rTjDSLqtyGOFLO+UQKBgQD8+X9sP04gsUq1DjBC\nongLU6jR9IXCuwv6i7rs424UZWJXI6fandWCmvwk677aNw+YnEEMSgJTEq3yhJJT\ntVT43NVF7AfSXMrAfj/oAZ9boFQQ1Ji982ceugEoFcv750Td3PAE07XAlBZDuvF2\nFoQfzHl114UEN/uah/Xg4py/bwKBgQD2M+9l8z7Vj/jAxpC4a8BVxZ6oUUO9Ru4j\nuaMp3osGDCz+h0lfEY+mZJ/HukdBRJRN/cXJMJCb1uL7c8sRPIG8OCuWV0ADp4+j\ndmqD8IUkN+J381imPBV3iGhpiB3WOaI9tuj2rmoblTIkg+Tn6gDNjQkNvN/L5WDC\nwKTFGr9B5wKBgAc80CN1sDOJPvztGf5eDZctXpAbMdR/a3lQlBmA7D5TJDwf/gZo\nK5qf+oTH5d7yYlTYa5gBag2cZDOjDVitwG+aSdPFS/f9xaM6OXPW0AtcC+urWW9d\nzl53rd7KuNpNJJBAaPGKaRHIatanO49IV6FdRUBU2S5kt6MVLrivYxKrAoGBAO9S\nEp6ecXC1D0+MdPbfvslhXNUukVM21JujgshbS/Zn9YDBTv/7mRBcdbh3CXaXTDX3\nvb/Q1nC11FQq/bTWhSHJ1AzC6TXkNkrl+6ofLbzEGf8RbBXDB/b2gNA8gQxRX7Tv\nzMqlRf1j7Kb0EpmgrIEiXC+fbkfLw1/sVP5H/qv3AoGBALimo2G5sr+8TPP0EjR6\n8DMnI2jZDs/oMUsjWFg9CFVY8eM9Yga9O4r+NDUgSmP41Th5P93UoGua93jkvFJq\n/j/pZ/UR11HIzJfeU1Ngq8hi9JXlFBbQqv/RyHZwTA9miR8blzvx1rt7KBX80kW7\nphZ/aJHyvjBp3JiyBJ2IGgAz\n-----END PRIVATE KEY-----\n`
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function run() {
  const cs2 = await db.collection("cs2Matches").get();
  console.log("CS2 Matches count:", cs2.docs.length);

  const ufc = await db.collection("ufcFights").get();
  console.log("UFC Fights count:", ufc.docs.length);
}

run().catch(console.error);
