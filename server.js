const { execSync } = require('child_process');
const express = require('express');
const fs = require('fs');
const app = express();

function createServer() {

    const port = 3000;

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
        let mode = '';
        // save a reference to fs.watch to stop it on connection close
        let watcher;

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
            watcher?.close();
            res.end();
        })

        // res.write('event: maintenance\n');
        // When a file changes, send an event to the client
        watcher = fs.watch(__dirname + '/public/static', () => {
            fs.stat(__dirname + '/public/static/isUnderMaintenance.json', (err, stats) => {
                if (stats && mode !== 'maintenance') {
                    mode = 'maintenance';
                    res.write('data:file-present\n\n', () => console.log('enabling maintenance mode'));
                }
                if (err && mode !== 'operational') {
                    mode = 'operational';
                    res.write('data:file-absent\n\n', () => console.log('disabling maintenance mode'));
                }
            });
        });

    })

    app.listen(port, () => {
        console.log(`Server started on port ${port}`);
    });

    return app;
}

module.exports = createServer();