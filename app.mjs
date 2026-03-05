import { log } from 'console';
import {readFile} from 'fs/promises';
import { writeFile } from 'fs/promises';
import { createServer } from 'http';
import crypto from 'crypto';
import path from 'path';
import { stringify } from 'querystring';



const PORT = 3002;
const DATAFILE = path.join("data","/links.json");

const loadLinks = async () => {
    try {
        const data = await readFile(DATAFILE, 'utf-8');

        if(!data.trim()){
            return {};
        }
        return  JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT"){
            await writeFile(DATAFILE, JSON.stringify({}))
            return {};
        }
        throw error;
    }
}

const saveLinks = async(Links) => {
    await writeFile (DATAFILE, JSON.stringify(Links))
}

const serverFile = async (res, filePath, contentType) => {
    
    try {
        const data = await readFile(filePath);
        res.writeHead(200, {'Content-Type' : contentType});
        res.end(data);  

    }catch (error) {
        res.writeHead(404,{'Content-Type' : "text/plain"});
        res.end("404 page not found");
    }

};



const server = createServer(async (req,res) => {
    console.log(req.url);

    if (req.method === 'GET') {
        if (req.url === '/') {
            return serverFile(res, path.join('public','index.html'),"text/html") ;
        }
    else if (req.url === '/style.css')  {
             return serverFile(res, path.join('public','style.css'),"text/css") ;
        }
        else if (req.url === "/links"){
            const links = await loadLinks();

            res.writeHead(200, {'Content-Type':'application/json'});
            return res.end(JSON.stringify(links));
        }else {
            const links = await loadLinks();
            const shortCode = req.url.slice(1);
            console.log("Links red..",req.url );

            if(links[shortCode]){
                res.writeHead(302,{location : links[shortCode]});
                return res.end();

            }

            res.writeHead(404, {'Content-Type':'text/plain'});
            return res.end("Shortened URL  not found");
            
        }
    }

    if(req.method === "POST" && req.url === '/shorten'){

        const links = await loadLinks();

        let body = "";
        req.on("data" , (chunk)=> {
            body = body + chunk;
        });
        req.on('end', async()   => {
            console.log(body);
            
            const {url, shortCode } = JSON.parse(body);

            if(!url){
                res.writeHead(400, {"Content-Type" : "text/plain"});
                return res.end ("URL is required"); 
            }

            const finalShortCode = shortCode || crypto.randonBytes(4).toString('hex');

            if (links[finalShortCode]) {
                res.writeHead(400, {'Content-Type' : 'text/plain'});
                return res.end("SHORT CODE EXISTS > TRY NEW");
            }

            links[finalShortCode] = url;

            await saveLinks(links);

            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({success: true, shortCode: finalShortCode}));
        });
    }

    
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    
})