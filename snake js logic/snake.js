const board = document.querySelector(".board");
const startBtn = document.querySelector(".btn-start");
const modal = document.querySelector(".modal");
const startGame = document.querySelector(".start-game");
const gameOver = document.querySelector(".game-over");
const restartBtn = document.querySelector(".btn-restart");
const highScoreElt = document.querySelector("#high-score")
const scoreElt = document.querySelector("#score");
const timeElt = document.querySelector("#time");

const blockWidth = 40;
const blockHeight = 40;

let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let time = `00:00`;

const cols = Math.floor(board.clientWidth / blockWidth);
const rows = Math.floor(board.clientHeight / blockHeight);


let intervalId = null;
let timerIntervalId = null;


let food = {x:Math.floor(Math.random()*rows), y:Math.floor(Math.random()*cols)};

const blocks = [];
let snake = [{
    x:1,y:3
}];

let direction = "right";

for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
   let block = document.createElement("div");
   block.classList.add("block");
    board.appendChild(block);
    blocks[`${row}-${col}`] = block;
  }
}

function render(){
    let head = null;
    blocks[`${food.x}-${food.y}`].classList.add("food");


    if(direction === "left"){
        head = {x:snake[0].x, y:snake[0].y-1};
    } else if(direction === "right"){
        head = {x:snake[0].x, y:snake[0].y+1};
    } else if(direction === "down"){
        head = {x:snake[0].x+1, y:snake[0].y};
    } else if(direction === "up"){
        head = {x:snake[0].x-1, y:snake[0].y};
    } 

    if(head.x < 0 || head.x >= rows || head.y < 0 || head.y >= cols){
        clearInterval(intervalId);
        modal.style.display = "flex";
        startGame.style.display = "none";
        gameOver.style.display = "flex";
        return;
    }

    // food consuming logic
    if(head.x == food.x && head.y == food.y){
        blocks[`${food.x}-${food.y}`].classList.remove("food");
        food = {x:Math.floor(Math.random()*rows), y:Math.floor(Math.random()*cols)};
        blocks[`${food.x}-${food.y}`].classList.add("food");
        snake.unshift(head);

        score += 10;
        scoreElt.innerText = score;

        if(score > highScore){
            highScore = score;
            localStorage.setItem("highScore",highScore.toString());
        }
    }

    snake.forEach(segment=>{
        blocks[`${segment.x}-${segment.y}`].classList.remove("fill");
    })
    snake.unshift(head);
    snake.pop();
    snake.forEach(segment=>{
        blocks[`${segment.x}-${segment.y}`].classList.add("fill");
    })
}

startBtn.addEventListener("click", ()=>{
    modal.style.display = "none";
    intervalId = setInterval(()=>{
        render();
    },200);

    timerIntervalId = setInterval(()=>{
        let [min,sec] = time.split(":").map(Number);
        if(sec===59){
            min += 1;
            sec = 0;
        } else{
            sec += 1;
        }
      time = `${min}:${sec}`;
      timeElt.innerText = time;

    },1000)
});

restartBtn.addEventListener("click", restartGame);

function restartGame(){

   blocks[`${food.x}-${food.y}`].classList.remove("food");
   snake.forEach(segment=>{
        blocks[`${segment.x}-${segment.y}`].classList.remove("fill");
    })

    score = 0;
    time = `00:00`;

    scoreElt.innerText = score;
    timeElt.innerText = time;
    highScoreElt.innerText = highScore;

  modal.style.display = "none";
  direction = "down";
  snake = [{
    x:1,y:3
   }];
   food = {x:Math.floor(Math.random()*rows), y:Math.floor(Math.random()*cols)};
   intervalId = setInterval(()=>{
        render();
    },300);
}



addEventListener("keydown", (event)=>{
    if(event.key == "ArrowUp"){
        direction = "up";
    } else if(event.key == "ArrowDown"){
        direction = "down";
    } else if(event.key == "ArrowLeft"){
        direction = "left";
    } else if(event.key == "ArrowRight"){
        direction = "right";
    }
})