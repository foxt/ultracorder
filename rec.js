
var $$ = document.getElementById.bind(document);
var $ = document.querySelector.bind(document);


if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia || !window.showSaveFilePicker || !VideoEncoder || !VideoFrame) {
    middle.className = "unsupported"
}

/**
 * @type {VideoEncoder}
 */
var enc;
/**
 * @type {HTMLVideoElement}
 */
var video;


function onError(error) {
    $$('error').innerText += error.toString() + "\n";
} 
var container = $$("#middle")
async function stop() {
    clearInterval(interval)
    video.srcObject.removeTrack(video.srcObject.getVideoTracks()[0])
    await writer.complete();
    writable.close();
    enc.close()
    middle.className = "done"
}

async function target() {
    console.log("Starting...")

    console.log("Creating video...")
    $$("preview-container").innerHTML = "";
    video = document.createElement("video");
    video.autoplay = true;
    video.controls = false;
    $$("preview-container").appendChild(video);
    try {
        console.log("Requesting access to screen...")
        var stream = await navigator.mediaDevices.getDisplayMedia()
        console.log("Playing screen stream...")
        video.srcObject = stream;
        await video.play();
        middle.className = "controls"
    } catch(e) {
        alert("Could not capture display: " + e.toString());
        return location.reload();
    }
}
async function start() {

    var width = video.videoWidth
    var height = video.videoHeight

    handle = await window.showSaveFilePicker({
        startIn: "videos",
        suggestedName: "recording.webm",
        types: [{description: "Web Movie Format", accept: {"video/webm": ".webm"}}]
    })
    try {
        writable = await handle.createWritable();
        writer = new WebMWriter({
            fileWriter: writable,
            codec: $("option[value='"+$$("codec").value+"']").innerText,
            width, height
        })
    } catch(e) {

        alert("Couldn't create file writer: " + e)
        writable.close()
        writer.complete()
        return;
    }


   


    console.log("Creating encoder...")
    var status = $$("status-text")
    /**
     * 
     * @param {EncodedVideoChunk} chunk 
     */
    function handleVideoChunk(chunk,metadata) {
        try {
            var timestamp = frameCount / fr
            var h = Math.floor(timestamp / 3600)
            var m = Math.floor((timestamp % 3600) / 60)
            var s = Math.floor(timestamp % 60)
            status.innerHTML = `Frames: <code>${frameCount}</code> Duration: <code>${h}h${m}m${s}s</code>`

            writer.addFrame(chunk);
        } catch(e) {
            onError(e);
        }
    }
    try {
        enc = new VideoEncoder({output: handleVideoChunk,error:onError})
    } catch (e) {
        alert("Could not create encoder: " + e);
        return location.reload();
    }
    var fr = $$('framerate').value
    try {
        console.log("Configuring encoder...")
        enc.configure({
            codec: $$('codec').value + $$('encoder_options').value,
            width, height, 
            framerate: fr,
            bitrate: $$('bitrate').value * 1000_000,
            alpha: $$('alpha').checked ? "keep" : "discard",
            scalabilityMode: $$('scalability_mode').value,
            bitrateMode: $$('bitrate_mode').value,
            latencyMode: $$('latency_mode').value,
            hardwareAcceleration: $$('hw_acceleration').value,
        })
    } catch(e) {
        alert("Could not configure encoder: " + e);
        return location.reload();
    }

    var stats = new Stats();
    size = new stats.addPanel(new Stats.Panel("frameBacklog","#ff0000", "#422"));
    stats.showPanel( 3 );
    document.body.appendChild( stats.dom );
    var frameCount = 0;
    var keyframe_interval = $$('keyframe_interval')
    var max_queue_size = $$('max_queue_size')
    interval = setInterval(() => {
        try {
            size.update(enc.encodeQueueSize);
            if (max_queue_size.value <= 0 && enc.encodeQueueSize > max_queue_size.value) return;
            var frame = new VideoFrame(video);
            enc.encode(frame, {keyFrame: (frameCount % keyframe_interval.value) == 0});
            frameCount++;
            frame.close()
        } catch(e) {
            onError(e)
        }
    }, 1000 / fr)


    middle.className = "status"

}