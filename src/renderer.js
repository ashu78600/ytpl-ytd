const ytdl = require("ytdl-core");
const { createWriteStream } = require("fs");
const { ipcRenderer } = require("electron");

const path = require("path");
const { v4: uuidv4 } = require("uuid");
let videos = new Map(),
  writeStream,
  ytdType = "0";
//get references for navbar button
const navTitle = document.querySelector(".nav-title");
const navMusic = document.querySelector(".nav-music");
const navPlaylist = document.querySelector(".nav-playlist");

// get reference
const browseButton = document.querySelector(".browse-button");
const dirPath = document.querySelector(".dir-path");
const input = document.querySelector(".input-link");
const goButton = document.querySelector(".go-button");
const result = document.querySelector(".result");
const iconBox = document.querySelector(".icon-box");
const dirBox = document.querySelector(".directory");
const cancelDirBox = document.querySelector(".cancel");
const backCover = document.querySelector(".back-cover");

// init input
dirPath.value = __dirname;
const insertListener = (ref, type, callback) => {
  ref.addEventListener(type, callback);
};
// add click listener to nav bar menus
insertListener(navTitle, "click", (e) => {
  const ytdType = goButton.getAttribute("data-type");
  if (ytdType === "0") return;
  const el = e.target !== this ? e.target.parentElement : e.target;
  console.log(el);
  goButton.setAttribute("data-type", "0");
  console.log(goButton);
  el.querySelector("span").style.color = "tomato";
  navMusic.querySelector("span").style.color = "white";
  navPlaylist.querySelector("span").style.color = "white";
});
insertListener(navMusic, "click", (e) => {
  const ytdType = goButton.getAttribute("data-type");
  if (ytdType === "1") return;
  const el = e.target !== this ? e.target.parentElement : e.target;
  console.log(el);
  goButton.setAttribute("data-type", "1");
  console.log(goButton);
  navTitle.querySelector("span").style.color = "white";
  navPlaylist.querySelector("span").style.color = "white";
  el.querySelector("span").style.color = "tomato";
});
insertListener(navPlaylist, "click", (e) => {
  const ytdType = goButton.getAttribute("data-type");
  if (ytdType === "2") return;
  const el = e.target !== this ? e.target.parentElement : e.target;
  goButton.setAttribute("data-type", "2");
  console.log(goButton);
  console.log(el);
  navMusic.querySelector("span").style.color = "white";
  navTitle.querySelector("span").style.color = "white";
  el.querySelector("span").style.color = "tomato";
});

// add click listener to model open icon
insertListener(iconBox, "click", () => {
  backCover.style.display = "flex";
  dirBox.style.opacity = 1;
});
// stop event propagation to directory div
insertListener(dirBox, "click", (event) => event.stopPropagation());
// add click listener to MDir box model cancel button
insertListener(cancelDirBox, "click", () => {
  backCover.style.display = "none";
});
insertListener(backCover, "click", (event) => {
  backCover.style.display = "none";
});

//add click listener to directory browse butto
insertListener(browseButton, "click", async () => {
  filePath = await ipcRenderer.invoke("ytpl:dirPath");
  //   console.log(path);
  dirPath.value = filePath;
});

// add click listener to go button
insertListener(goButton, "click", async (e) => {
  const url = input.value.trim();
  if (url === "") {
    alert("Enter url.");
    return;
  }
  goButton.innerText = "Loading...";
  // disable go button
  e.target.disabled = true;
  // get yputube video stream
  const videoID = await ytdl.getURLVideoID(url);
  let info = await ytdl.getInfo(videoID);
  let items = info.formats;
  console.log(info);
  const id = uuidv4();
  // add video item to result element
  result.appendChild(getVideoItemHtml(info, id));
  goButton.innerText = "Go";
  // enable go button
  e.target.disabled = false;
  const parent = document.getElementById(id);

  const cancelVideo = parent.querySelector(".cancel-video");
  //remove video item
  insertListener(cancelVideo, "click", () => {
    cancelVideo.parentElement.remove();

    destroyStream(id);
  });
  const downloadVideoRef = parent.querySelector(".download-video");
  insertListener(downloadVideoRef, "click", downloadVideo);
});

// const getSelectHtml = (items) => {
//   let select = document.createElement("select");
//   select.id = "quality-list";
//   // create a new option
//   let options = new Option("Select quality", "0");
//   for (let item of items) {
//     if (item.container !== "mp4" || item.qualityLabel === null) {
//       continue;
//     }
//     option = `${item.qualityLabel} - ${item.container}`;
//     options = new Option(option, item.itag);
//     // add it to the list
//     select.add(options, undefined);
//   }
//   return select;
// };

const downloadVideo = (e) => {
  e.stopPropagation();
  const parent = e.target.parentElement.parentElement;
  const [titleRef, progressRef, sizeRef, speedRef, etsRef] =
    getVideoElementRef(parent);
  const id = parent.id;
  // get video id
  const videoID = e.target.getAttribute("data-id");

  // get title
  const title = titleRef.innerText.replace(/[^a-zA-Z0-9]/g, "_");
  // get directory path
  const filePath = dirPath.value;

  console.log(filePath);

  let output = path.resolve(filePath, `${title}.mp4`);
  // output = output.replace(/\s/g, ".");

  let startTime;
  console.log(output);

  try {
    let video = ytdl(videoID, {
      filter: (format) => format.container === "mp4",
    });
    console.log(video);
    video.once("response", () => {
      videos.set(id, video);
      console.log(videos);
      startTime = Date.now();
    });
    video.on("info", (info) => console.log(info));
    // listen to stream emmit event
    video.on("progress", (chunk, downloaded, total) => {
      const downloadedMilliSeconds = Date.now() - startTime;
      updateVideoElement(
        [titleRef, progressRef, sizeRef, speedRef, etsRef],
        downloaded,
        total,
        downloadedMilliSeconds
      );
    });
    // video.on(error, (e) => console.log(e));

    // listent to end of readable stream
    video.on("end", () => {
      // close read stream
      console.log("finished!");
      closeReadStream(video);
      writeStream.end();
    });
    // create writable stream
    writeStream = createWriteStream(output);
    video.pipe(writeStream);
  } catch (error) {
    console.log(error);
    destroyStream(id);
  }
};

const getVideoItemHtml = (info, id) => {
  const title = info.videoDetails.title;
  const videoId = info.videoDetails.videoId;
  const thumbnail = info.videoDetails.thumbnails[0].url;
  let resultItem = createElement("div", id, "result-item");

  let cancelVideo = createElement("div", "", "cancel-video");
  cancelVideo.innerHTML = '<i class="fas fa-window-close"></i>';
  let downloadVideo = createElement("div", "", "download-video");
  downloadVideo.innerHTML = `<i class="fas fa-arrow-alt-circle-down" data-id=${videoId}></i>`;
  resultItem.appendChild(cancelVideo);
  resultItem.appendChild(downloadVideo);

  let resultTop = createElement("div", "", "result-top");
  resultTop.innerHTML = ` <div class="thumbnail mx">
  <img src="${thumbnail}" height="100%" width="100%" />
</div>
<div class="video-title mx">${title}</div>`;
  let resultBottom = createElement("div", "", "result-bottom");
  resultBottom.innerHTML = `<div class="progress-track mx">
  <div class="progress-bar"></div>
</div>
<div class="download-meta">
  <div class="download-size mx"></div>
  <div class="download-speed mx"></div>
  <div class="download-ets mx"></div>
</div>`;

  resultItem.appendChild(resultTop);
  resultItem.appendChild(resultBottom);

  return resultItem;
};

// create element
const createElement = (type, id, className) => {
  const el = document.createElement(type);
  el.id = id;
  el.className = className;
  return el;
};
// milliseconds to readable time conversion
const timeConversion = (timeInMiliseconds) => {
  let h, m, s;
  h = Math.floor(timeInMiliseconds / 1000 / 60 / 60);
  m = Math.floor((timeInMiliseconds / 1000 / 60 / 60 - h) * 60);
  s = Math.floor(((timeInMiliseconds / 1000 / 60 / 60 - h) * 60 - m) * 60);
  s < 10 ? (s = `0${s}`) : (s = `${s}`);
  m < 10 ? (m = `0${m}`) : (m = `${m}`);
  h < 10 ? (h = `0${h}`) : (h = `${h}`);
  return `${h}:${m}:${s}`;
};

// bytes to correct size conversion
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
};

// bytes to
const getSpeed = (bytes, downloadedMilliSeconds, decimals = 2) => {
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const type = ["bps", "kbps", "mbps", "gbps"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const speed = parseFloat(
    ((bytes / Math.pow(k, i)) * 1000) / downloadedMilliSeconds
  ).toFixed(dm);
  return speed + type[i];
};

const getVideoElementRef = (parent) => {
  const titleRef = parent.querySelector(".video-title");
  const progressRef = parent.querySelector(".progress-bar");

  const sizeRef = parent.querySelector(".download-size");
  const speedRef = parent.querySelector(".download-speed");
  const etsRef = parent.querySelector(".download-ets");
  return [titleRef, progressRef, sizeRef, speedRef, etsRef];
};

const updateVideoElement = (
  refs,
  downloaded,
  total,
  downloadedMilliSeconds
) => {
  const [titleRef, progressRef, sizeRef, speedRef, etsRef] = refs;
  percent = downloaded / total;
  // update progress details
  progressRef.style.width = (percent * 100).toFixed(1) + "%";
  progressRef.innerText = (percent * 100).toFixed(1) + "%";
  // update video size detail
  sizeRef.innerText = formatBytes(total);
  // update speed

  speedRef.innerText = getSpeed(downloaded, downloadedMilliSeconds);
  const estimatedDownloadTime =
    downloadedMilliSeconds / percent - downloadedMilliSeconds;
  const ets = timeConversion(estimatedDownloadTime);

  // update time left
  etsRef.innerText = ets;
};
const closeReadStream = (stream) => {
  if (!stream) return;
  if (stream.close) stream.close();
  else if (stream.destroy) stream.destroy();
};

// destroy a stream
const destroyStream = (id) => {
  console.log("destroy", id);
  if (videos.size === 0) return;
  const video = videos.get(id);
  console.log(video);
  // destroy
  video.destroy();
  // delete current video stream
  videos.delete(id);
  console.log("destroyed", video.destroyed);
};
