const { execSync } = require('child_process');
const express = require('express');
const fs = require('fs');
const app = express();

function createServer() {

    const port = 3000;

    // watch for file changes
    const watcher = fs.watch(__dirname + '/public/static');
    const sendMessage = (req, res) => {
        fs.stat(__dirname + '/public/static/isUnderMaintenance.json', (err, stats) => {
            if (stats) {
                res.write('data:file-present\n\n', (error) => {
                    if (error) {
                        console.log(error);
                        return;
                    }
                    console.log(`file present message sent to ${req.socket.remotePort}`)
                });
            }
            if (err) {
                res.write('data:file-absent\n\n', (error) => {
                    if (error) {
                        console.log(error);
                        return;
                    }
                    console.log(`file absent message sent to ${req.socket.remotePort}`)
                });
            }
        })
    }


    // set root dir
    app.use(express.static(__dirname + '/public'));

    // get default route
    app.get('/', (res) => {
        res.sendFile('/index.html');
    });

    // Endpoint for server sent events subscribtions
    app.get('/events', (req, res) => {

        // the fs.watch callback gets triggered multiple times
        // but we want to send out just one event per file change
        let boundSendMessage = sendMessage.bind(this, req, res);

        // send headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        //res.write('retry: 1000\n\n');
        console.log('connect', req.socket.remotePort)

        // clean up on connection close
        req.on('close', () => {
            console.log('disconnect', req.socket.remotePort)
            watcher.removeListener('change', boundSendMessage);
            res.end('bye');
        })

        // When a file changes, send an event to the client
        watcher.addListener('change', boundSendMessage);
    });

    app.listen(port, () => {
        console.log(`Server started on port ${port}`);
    });

    return app;
}

module.exports = createServer();