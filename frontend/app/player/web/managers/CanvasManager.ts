import { TarFile } from 'js-untar';
import ListWalker  from "Player/common/ListWalker";
import { VElement } from 'Player/web/managers/DOM/VirtualDOM';
import unpack from 'Player/common/unpack';
import unpackTar from 'Player/common/tarball';

const playMode = {
  video: 'video',
  snaps: 'snaps',
} as const;

const TAR_MISSING = 'TAR_404';
const MP4_MISSING = 'MP4_404';

type Timestamp = { time: number }

export default class CanvasManager extends ListWalker<Timestamp> {
  private fileData: string | undefined;
  private videoTag = document.createElement('video');
  private snapImage = document.createElement('img');
  private lastTs = 0;
  private playMode: string = playMode.snaps;
  private snapshots: Record<number, TarFile> = {}

  constructor(
    /**
     * Canvas node id
     * */
    private readonly nodeId: string,
    /**
     * time between node creation and session start
     */
    private readonly delta: number,
    private readonly links: [tar: string, mp4: string],
    private readonly getNode: (id: number) => VElement | undefined
  ) {
    super();
    // first we try to grab tar, then fallback to mp4
    this.loadTar()
      .then((fileArr) => {
        this.mapToSnapshots(fileArr)
      })
      .catch((e) => {
        if (e === TAR_MISSING && this.links[1]) {
          this.loadMp4().catch((e2) => {
            if (e2 === MP4_MISSING) {
              return console.error(
                `both tar and mp4 recordings for canvas ${this.nodeId} not found`
              );
            } else {
              return console.error('Failed to load canvas recording');
            }
          });
        } else {
          return console.error('Failed to load canvas recording for node', this.nodeId);
        }
      });
  }

  public mapToSnapshots(files: TarFile[]) {
    const filenameRegexp = /(\d+)_1_(\d+)\.jpeg$/;
    const firstPair = files[0].name.match(filenameRegexp);
    const sessionStart = firstPair ? parseInt(firstPair[1], 10) : 0;
    files.forEach((file) => {
      const [_, _2, imageTimestamp] = file.name
                                        .match(filenameRegexp)
                                        ?.map((n) => parseInt(n, 10)) ?? [0, 0, 0];
      const messageTime = imageTimestamp - sessionStart;
      this.snapshots[messageTime] = file;
      this.append({ time: messageTime });
    });
  }

  loadTar = async () => {
    return fetch(this.links[0])
      .then((r) => {
        if (r.status === 200) {
          return r.arrayBuffer();
        } else {
          return Promise.reject(TAR_MISSING);
        }
      })
      .then((buf) => {
        const tar = unpack(new Uint8Array(buf));
        this.playMode = playMode.snaps;
        return unpackTar(tar);
      });
  };

  loadMp4 = async () => {
    return fetch(this.links[1])
      .then((r) => {
        if (r.status === 200) {
          return r.blob();
        } else {
          return Promise.reject(MP4_MISSING);
        }
      })
      .then((blob) => {
        this.playMode = playMode.video;
        this.fileData = URL.createObjectURL(blob);
      });
  };

  startVideo = () => {
    if (!this.fileData || this.playMode !== playMode.video) return;
    this.videoTag.setAttribute('autoplay', 'true');
    this.videoTag.setAttribute('muted', 'true');
    this.videoTag.setAttribute('playsinline', 'true');
    this.videoTag.setAttribute('crossorigin', 'anonymous');
    this.videoTag.src = this.fileData;
    this.videoTag.currentTime = 0;
  };

  move(t: number) {
    if (this.playMode === playMode.video) {
      this.moveReadyVideo(t);
    } else {
      this.moveReadySnap(t);
    }
  }

  moveReadyVideo = (t: number) => {
    if (Math.abs(t - this.lastTs) < 100) return;
    this.lastTs = t;
    const playTime = t - this.delta;
    if (playTime > 0) {
      const node = this.getNode(parseInt(this.nodeId, 10));
      if (node && node.node) {
        const canvasCtx = (node.node as HTMLCanvasElement).getContext('2d');
        const canvasEl = node.node as HTMLVideoElement;
        if (!this.videoTag.paused) {
          void this.videoTag.pause();
        }
        this.videoTag.currentTime = playTime / 1000;
        canvasCtx?.drawImage(this.videoTag, 0, 0, canvasEl.width, canvasEl.height);
      } else {
        console.error(`CanvasManager: Node ${this.nodeId} not found`);
      }
    }
  }

  moveReadySnap = (t: number) => {
    const msg = this.moveGetLast(t)
    if (msg) {
      const file = this.snapshots[msg.time]
      if (file) {
        this.snapImage.src = file.getBlobUrl();

        const node = this.getNode(parseInt(this.nodeId, 10));
        if (node && node.node) {
          const canvasCtx = (node.node as HTMLCanvasElement).getContext('2d');
          const canvasEl = node.node as HTMLVideoElement;
          canvasCtx?.drawImage(this.snapImage, 0, 0, canvasEl.width, canvasEl.height);
        } else {
          console.error(`CanvasManager: Node ${this.nodeId} not found`);
        }
      }
    }
  }
}
