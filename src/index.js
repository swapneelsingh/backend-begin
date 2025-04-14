import dotenv from 'dotenv'
import { config } from 'dotenv';
import connectDB from './db/index.js'

dotenv.config({path: './env'})

connectDB()
.then(() => {
    app.listen(process.env.POST || 8000, () => {
        console.log(`server is running on port : ${process.env.PORT}`); 
    })
})
.catch((error) => {
    console.log("MONGODB connection failed !!! : ", error)
})

/*

-- it is one of the method we can connect to mongoDB --
import express from 'express'
const app = express();
(async() => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("ERRR : ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    }

    catch (error) {
        console.error("ERROR : ", error);
        throw error;      
    }
})();
*/