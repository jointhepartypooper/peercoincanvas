<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import VueNumberInput from "@chenfengyuan/vue-number-input";
import QrcodeVue from "qrcode.vue";
import { P2putPixelAddrGenerator, Colour } from "../P2putPixelAddrGenerator";
defineProps<{
  msg: string;
}>();
const canvasRef = ref();
const gen = new P2putPixelAddrGenerator("pc", [0xc7, 0x66, 0xce, 0xc1, 0xef]);
const x = ref(1);
const y = ref(1);
const xtop = ref(1);
const ytop = ref(1);
const xbottom = ref(1);
const ybottom = ref(1);
const xcanvas = ref(1);
const ycanvas = ref(1);
const selectedColor = ref(0);
const amount = ref("0.01");
let context = null as any;
let stroke = [] as Array<string>;
let color = [] as Array<number>;
let clickX = [] as Array<number>;
let clickY = [] as Array<number>;
let clickDrag = [] as Array<boolean>;
let paint = false;
let canvas = null as any;

onMounted(() => {
  canvas = canvasRef.value;
  context = canvas.getContext("2d");

  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  context.fillStyle = "#ff0000";
  context.strokeStyle = "#ff0000";
  context.lineJoin = "round";
  context.lineWidth = 1;

  canvas.addEventListener("mousedown", mouseWins);
  canvas.addEventListener("touchstart", touchWins);
});

const qr = computed(
  () =>
    "peercoin:" +
    gen.forPixelColour({ x: x.value, y: y.value }, selectedColor.value) +
    "?amount=" +
    amount.value
);

function generateFreehand() {
  //validate input
  if (clickX.length === 0) return;
  let csv = "";
  let csvFileData = [] as Array<Array<string>>;
  let add = (address: string, amount: string) => {
    if (!csvFileData.some((a) => a[0] === address)) {
      csvFileData.push([address, amount]);
    }
  };
  for (let i = clickX.length - 1; i >= 0; i--) {
    let curX = xcanvas.value + clickX[i];
    let curY = ycanvas.value + clickY[i];
    let curColor = color[i];
    add(gen.forPixelColour({ x: curX, y: curY }, curColor), amount.value);
  }

  csvFileData.forEach((row) => {
    csv += row.join(",");
    csv += "\n";
  });
  download("freehand.csv", csv);
}

function generate() {
  //debugger;
  //validate input
  if (xtop.value > xbottom.value || ytop.value > ybottom.value) return;
  let csv = "";
  // let indexx = xtop.value;
  let indexy = ytop.value;
  let csvFileData = [] as Array<Array<string>>;
  let add = (address: string, amount: string) => {
    if (!csvFileData.some((a) => a[0] === address)) {
      csvFileData.push([address, amount]);
    }
  };

  do {
    let curX = xtop.value;

    do {
      add(
        gen.forPixelColour({ x: curX, y: indexy }, selectedColor.value),
        amount.value
      );

      curX++;
    } while (curX <= xbottom.value);

    //  indexx++;
    indexy++;
  } while (indexy <= ybottom.value);

  csvFileData.forEach((row) => {
    csv += row.join(",");
    csv += "\n";
  });
  download("block.csv", csv);
}

function download(filename: string, text: string) {
  let element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function addClick(x: number, y: number, dragging: boolean) {
  clickX.push(x);
  clickY.push(y);
  color.push(selectedColor.value);
  stroke.push(Colour.fromId(selectedColor.value).cssStr);
  clickDrag.push(dragging);
}

function drawNew() {
  let i = clickX.length - 1;
  context.fillStyle = stroke[i]; // "#F9DC5C";
  context.fillRect(clickX[i], clickY[i], 1, 1);
}

function clearCanvas() {
  stroke = [] as Array<string>;
  color = [] as Array<number>;
  clickX = [] as Array<number>;
  clickY = [] as Array<number>;
  clickDrag = [] as Array<boolean>;
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
}

function mouseDownEventHandler(e: any) {
  paint = true;

  let rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;

  if (paint) {
    addClick(x, y, false);
    drawNew();
  }
}

function touchstartEventHandler(e: any) {
  paint = true;
  if (paint) {
    addClick(
      e.touches[0].pageX - canvas.offsetLeft,
      e.touches[0].pageY - canvas.offsetTop,
      false
    );
    drawNew();
  }
}

function mouseUpEventHandler(e: any) {
  paint = false;
}

function mouseMoveEventHandler(e: any) {
  let rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;

  if (paint) {
    addClick(x, y, true);
    drawNew();
  }
}

function touchMoveEventHandler(e: any) {
  if (paint) {
    addClick(
      e.touches[0].pageX - canvas.offsetLeft,
      e.touches[0].pageY - canvas.offsetTop,
      true
    );
    drawNew();
  }
}

function setUpHandler(isMouseandNotTouch: boolean, detectEvent: any) {
  removeRaceHandlers();
  if (isMouseandNotTouch) {
    canvas.addEventListener("mouseup", mouseUpEventHandler);
    canvas.addEventListener("mousemove", mouseMoveEventHandler);
    canvas.addEventListener("mousedown", mouseDownEventHandler);
    mouseDownEventHandler(detectEvent);
  } else {
    canvas.addEventListener("touchstart", touchstartEventHandler);
    canvas.addEventListener("touchmove", touchMoveEventHandler);
    canvas.addEventListener("touchend", mouseUpEventHandler);
    touchstartEventHandler(detectEvent);
  }
}

function mouseWins(e: any) {
  setUpHandler(true, e);
}

function touchWins(e: any) {
  setUpHandler(false, e);
}

function removeRaceHandlers() {
  canvas.removeEventListener("mousedown", mouseWins);
  canvas.removeEventListener("touchstart", touchWins);
}
</script>

<template>
  <div class="divTable" style="width: 100%">
    <div class="divTableBody">
      <div class="divTableRow">
        <div class="divTableCell">
          <qrcode-vue :value="qr" :size="500" level="M" :margin="15" />
        </div>
        <div class="divTableCell">
          <div class="greetings">
            <h1 class="green">{{ msg }}</h1>
            <h1 class="green">
              X
              <vue-number-input
                v-model="x"
                :min="1"
                :max="999"
                inline
                controls
              ></vue-number-input>
              &nbsp;&nbsp;&nbsp; Y
              <vue-number-input
                v-model="y"
                :min="1"
                :max="999"
                inline
                controls
              ></vue-number-input>
            </h1>
            <select v-model="selectedColor">
              <option v-for="c in Colour.palette" :value="c.id">
                {{ c.name }}
              </option>
            </select>
            amount <input v-model="amount" />
            <div>
              {{ qr }}
            </div>
          </div>
        </div>
      </div>

      <div class="divTableRow">
        <div class="divTableCell">
          <div>
            <h1 class="green">csv rectangle generator</h1>
            <h3 class="green">
              Top left X
              <vue-number-input
                v-model="xtop"
                :min="1"
                :max="999"
                inline
                controls
              ></vue-number-input>
              <br />
              Top Left Y
              <vue-number-input
                v-model="ytop"
                :min="1"
                :max="999"
                inline
                controls
              ></vue-number-input>
            </h3>
            <br />

            <select v-model="selectedColor">
              <option v-for="c in Colour.palette" :value="c.id">
                {{ c.name }}
              </option>
            </select>
            amount <input v-model="amount" />
          </div>
        </div>
        <div class="divTableCell">
          <h3 class="green">
            Bottom right X
            <vue-number-input
              v-model="xbottom"
              :min="1"
              :max="999"
              inline
              controls
            ></vue-number-input>
            <br />
            Bottom right Y
            <vue-number-input
              v-model="ybottom"
              :min="1"
              :max="999"
              inline
              controls
            ></vue-number-input>
          </h3>
          <button @click="generate">download csv</button>
        </div>
      </div>

      <div class="divTableRow">
        <div class="divTableCell">
          <h1 class="green">csv freehand generator</h1>

          <canvas
            id="sheet"
            ref="canvasRef"
            width="250"
            height="250"
            style="border: 1px solid #00a300"
          ></canvas>
        </div>
        <div class="divTableCell">
          <h3 class="green">
            Top left X
            <vue-number-input
              v-model="xcanvas"
              :min="1"
              :max="999"
              inline
              controls
            ></vue-number-input>
            <br />
            Top left Y
            <vue-number-input
              v-model="ycanvas"
              :min="1"
              :max="999"
              inline
              controls
            ></vue-number-input>
          </h3>
          <select v-model="selectedColor">
            <option v-for="c in Colour.palette" :value="c.id">
              {{ c.name }}
            </option>
          </select>
          <br />
          amount <input v-model="amount" />
          <button @click="clearCanvas">clear canvas</button>
          <button @click="generateFreehand">download csv</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}
.greetings {
  position: absolute;
  top: 5%;
  height: 100px;
  margin-top: -50px;
}
.greetings h1,
.greetings h3 {
  text-align: left;
}

.divTable {
  display: table;
  width: 100%;
}
.divTableRow {
  display: table-row;
}
.divTableHeading {
  background-color: #eee;
  display: table-header-group;
}
.divTableCell,
.divTableHead {
  border: 0px solid #999999;
  display: table-cell;
  padding: 3px 10px;
}
.divTableHeading {
  background-color: #eee;
  display: table-header-group;
  font-weight: bold;
}
.divTableFoot {
  background-color: #eee;
  display: table-footer-group;
  font-weight: bold;
}
.divTableBody {
  display: table-row-group;
}
</style>
