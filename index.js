//DEPENDENCIES
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors')
const app = express();
const fs = require('fs');
const moment = require('moment');
const dirTree = require("directory-tree");

dotenv.config();

//GLOBALS
const PORT = process.env.PORT || 8080;
const { SERVER_TOKEN } = process.env;

//FUNCTIONS
const writeJSONFile = (file, path) => {
    fs.writeFileSync(path, JSON.stringify(file, null, 2), (err) => {
        if(err){console.error(err);}
    });
}
const readJSONFile = (path) => {
    if(!fs.existsSync(path)){return null}
    const file = fs.readFileSync(path, (err)=>{
        if(err){console.error(err)}
    });
    return JSON.parse(file);
}

//API
if(!fs.existsSync('./jdatabase')){
    fs.mkdirSync('./jdatabase');
}
if(!fs.existsSync('./jdatabase/connections')){
    fs.mkdirSync('./jdatabase/connections');
}

app.use(cors());
app.use(express.json());

app.get('/test', (req, res) => {
    res.status(200).send('API is online.');
});

app.get('/connections', (req, res) => {
    const {token} = req.query;
    if(token !== SERVER_TOKEN){
        res.status(401).send('Token is missing or not valid.');
    }else{
        const tree = dirTree('./jdatabase/connections');
        res.status(200).send(tree);
    }
});

app.get('/connection', (req, res) => {
    const {token, fileName} = req.query;
    if(token !== SERVER_TOKEN){
        res.status(401).send('Token is missing or not valid.');
    }else{
        const file = readJSONFile(`./jdatabase/connections/connection-log.${fileName}.json`);
        res.status(200).send(file.sort((a,b)=>moment(a.date, "DD/MM/YYYY HH:mm:ss")>moment(b.date, "DD/MM/YYYY HH:mm:ss")?-1:1));
    }
});

app.delete('/connection', (req, res) => {
    const {token, fileName} = req.query;
    if(token !== SERVER_TOKEN){
        res.status(401).send('Token is missing or not valid.');
    }else{
        const path = `./jdatabase/connections/connection-log.${fileName}.json`;
        if(fs.existsSync(path)){
            fs.unlinkSync(path);
            res.status(200).send(true);
            console.log(`${fileName} deleted successfully.`);
        }else{
            res.status(400).send("File not existing.");
        }
    }
});

app.post('/connection', (req, res) => {
    if(req.err){
        console.log("There was a failure in POST /connection", req.err); 
        res.status(200).send(true);
        return;
    }
    const path = `./jdatabase/connections/connection-log.${req.body.visitorId}.json`;
    let connectionLog = readJSONFile(path) || [];
    const {headers, ip, body} = req;
    connectionLog = [{
        ip,
        timeStamp: Date.now(), 
        date: moment(Date.now()).format("DD/MM/YYYY HH:mm:ss"), 
        pathname: body?.pathname,
        headers, 
        fingerPrint: {
            visitorId: body?.visitorId,
            confidence: body?.confidence?.score,
            osCpu: body?.components?.osCpu?.value,
            languages: body?.components?.languages?.value,
            timeZone: body?.components?.timeZone?.value,
            screenResolution: body?.components?.screenResolution?.value,
            vendor: body?.components?.vendor?.value,
            platform: body?.components?.platform?.value,
        },
        localStorage: body?.localStorage,
    }, ...connectionLog];
    if(connectionLog.length > 100){
        connectionLog.shift();
    }
    writeJSONFile(connectionLog, path);
    console.log(`${body?.visitorId} tracked on ${body?.pathname}`)
    res.status(200).send(true);
});

app.listen(PORT, () => {
    console.log(`Server started on PORT ${PORT}.`);
});
