var audioContext = null;
var isPlaying = false;      // Are we currently playing?

var currentNote;        // What note is currently last scheduled?
var tempo = 120.0;          // tempo (in beats per minute)
var lookahead = 25.0;       // How frequently to call scheduling fun, ms
var noteType = 4;
var scheduleAheadTime = 0.1;    // How far ahead to schedule audio (sec)
var nextNoteTime = 0.0;     // when the next note is due.
var noteLength = 0.05;      // length of "beep" (in seconds)
var canvas,                 // the canvas element
    canvasContext;          // canvasContext is the canvas' context 2D
var lastNoteDrawn = -1; // the last "box" we drew on the screen
var notesInQueue = [];      // the notes that have been put into the web audio,
                            // and may or may not have played yet. {note, time}
var timerWorker = null;     // The Web Worker used to fire timer messages
var beats = 3;


// First, let's shim the requestAnimationFrame API, with a setTimeout fallback
window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();


//Changing the beats or measures need to be sheduled so as to not happen at the 'wrong' time.
function nextNote() {

    var secondsPerBeat = 60.0 / tempo;
    nextNoteTime += 4/noteType * secondsPerBeat;

    currentNote++;
    if (currentNote == beats) {
        currentNote = 0;
    }
}

function scheduleNote(beatNumber, time) {
    notesInQueue.push({note: beatNumber, time: time});

    var osc = audioContext.createOscillator();
    osc.connect(audioContext.destination);

    if (beatNumber === 0)   //first note get's different pitch
        osc.frequency.value = 440.0;
    else
        osc.frequency.value = 220.0;
    osc.start(time);
    osc.stop(time + noteLength);
}

function scheduler() {
    // while there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        scheduleNote(currentNote, nextNoteTime);
        nextNote();
    }
}

function play() {
    isPlaying = !isPlaying;

    if (isPlaying) { // start playing
        currentNote = 0;
        nextNoteTime = audioContext.currentTime;
        timerWorker.postMessage("start");
        return String.fromCharCode(9612) + String.fromCharCode(9612);

    } else {
        timerWorker.postMessage("stop");
        return String.fromCharCode(9658);

    }
}

function draw() {
    var currentNote = lastNoteDrawn;
    var currentTime = audioContext.currentTime;

    while (notesInQueue.length && notesInQueue[0].time < currentTime) {
        currentNote = notesInQueue[0].note;
        notesInQueue.splice(0, 1);   // remove note from queue
    }

    if (lastNoteDrawn != currentNote) {
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        if (currentNote == 0) {
            canvasContext.fillStyle = '#eae';
        }
        else if (currentNote % 2 == 0) {
            canvasContext.fillStyle = 'red';
        }
        else {
            canvasContext.fillStyle = 'blue';
        }

        console.log('draw');
        canvasContext.beginPath();
        canvasContext.arc(20, 20, 20, 0, 2 * Math.PI);
        canvasContext.fill();
        lastNoteDrawn = currentNote;
    }

    // set up to draw again

    requestAnimFrame(draw);
}

function init() {

    canvas = document.getElementById('canvas');
    canvasContext = canvas.getContext('2d');
    canvas.width = 40;
    canvas.height = 40;
    canvasContext.strokeStyle = "#000";
    canvasContext.lineWidth = 2;

    audioContext = new AudioContext();


    requestAnimFrame(draw);    // start the drawing loop.

    timerWorker = new Worker("js/metronomeworker.js");

    timerWorker.onmessage = function (e) {
        if (e.data == "tick") {

            scheduler();
        }
        else
            console.log("message: " + e.data);
    };
    timerWorker.postMessage({"interval": lookahead});
}


function displayCanvas(){
    document.getElementById('canvas').style.display = 'inline-block';
}

window.addEventListener("load", init);
