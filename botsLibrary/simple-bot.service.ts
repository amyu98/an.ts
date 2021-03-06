import { Injectable } from '@angular/core';
import { CentralService } from '../game/central.service';
import { Action, ActionOption } from '../models/Action';
import { Ant } from '../models/Ant';
import { Coordinates } from '../models/Coordinates';
import { GameSquare } from '../models/GameSquare';
import { UserTick } from '../models/UserTIck';

@Injectable({
  providedIn: 'root'
})
export class SimpleBotService {

  readonly userName: string = "simple bot";

  readonly botConfig = {
    numberToDirection: {

      // down-right
      0: ((coords: Coordinates) => {
        return { x: coords.x + 1, y: coords.y + 1 }
      }),
      // down
      1: ((coords: Coordinates) => {
        return { x: coords.x, y: coords.y + 1 }
      }),
      // down-left
      2: ((coords: Coordinates) => {
        return { x: coords.x - 1, y: coords.y + 1 }
      }),
      // left
      3: ((coords: Coordinates) => {
        return { x: coords.x - 1, y: coords.y }
      }),
      // top-left
      4: ((coords: Coordinates) => {
        return { x: coords.x - 1, y: coords.y - 1 }
      }),
      // top
      5: ((coords: Coordinates) => {
        return { x: coords.x, y: coords.y - 1 }
      }),
      // top-right
      6: ((coords: Coordinates) => {
        return { x: coords.x + 1, y: coords.y - 1 }
      }),
      // right
      7: ((coords: Coordinates) => {
        return { x: coords.x + 1, y: coords.y }
      }),

    }
  }

  //#region Deafult bot boiler plate.
  constructor(private centralService: CentralService) {
    setTimeout(() => {
      this.initPlayer();
    }, 20);
  }

  initPlayer() {
    this.centralService.register({ userName: this.userName })
      .subscribe(tick => {
        this.act(tick);
      })
  }

  act(tick: UserTick) {

    // let myColony = tick.colony;
    let myAnts = tick.ants;
    let boardSize = tick.boardSize;

    myAnts.forEach(ant => {

      if (!ant.surroundings.length) return

      ant.nextAction = this.antAction(ant, boardSize);
    })

    this.centralService.actionInput.next({ userName: this.userName, ants: myAnts })
  }
  //#endregion default bot boiler plate.

  antAction(ant: Ant, boardSize: Coordinates): Action {

    // Bool 1 = is not to follow my own steps back?

    let type: ActionOption;
    let nextMoveSquare: Coordinates;

    let funcsArray = Object.values(this.botConfig.numberToDirection);

    let antIndex = +ant.id.split('_')[1];

    let antFuncIndex = antIndex + ant.smallNumber;

    // Define basic movement funcs.
    let directionMainFunc =
      funcsArray[(antFuncIndex) % funcsArray.length];

    // Opposite move func. 
    let directionOppFunc =
      funcsArray[(antFuncIndex + (funcsArray.length / 2)) % funcsArray.length]


    // 0 bring food to colony
    if (ant.food?.length) {

      let colony = ant.surroundings.find(s => s.colony?.player == this.userName);

      // If colony found, drop food to colony.
      if (colony) {
        type = 'DropFood';
        nextMoveSquare = colony.coordinates;
      }

      // Search for colony!
      else {
        // Move to:
        type = "Move";


        let rnd = Math.random();
        if (rnd < 0.2) {
          let rndNext = [0, 1, 2, 3, 4, 5, 6, 7][(ant.smallNumber + 1) % 8];
          ant.smallNumber = rndNext as any;
        }


        nextMoveSquare = findMove(false, this.centralService.width, this.centralService.height);
      }


    } else {

      // 1 pick food
      let foodPileSquare = ant.surroundings.find(s => s.foodPile);
      if (foodPileSquare) {
        ant.smallNumber = 0;
        type = 'PickFood';
        nextMoveSquare = foodPileSquare.coordinates;
      }

      // 2 move
      else {
        type = "Move";
        nextMoveSquare = findMove(false, this.centralService.width, this.centralService.height);
      }
    }

    return {
      type: type,
      nextSquare: nextMoveSquare
    };

    function findMove(directionFlag: boolean, gameWidth: number, gameHeight: number) {

      let nextMoveSquareTemp;

      nextMoveSquareTemp = !directionFlag ? directionMainFunc(ant.coordinates) : directionOppFunc(ant.coordinates);

      while (isMoveIleagal(nextMoveSquareTemp, ant.surroundings, gameWidth, gameHeight)) {

        // let rnd = Math.random() * 8;
        // ant.smallNumber = Math.floor(rnd) as any;
        // let rndNext = [0, 1, 2, 3, 4, 5, 6, 7][(ant.smallNumber + 1) % 8];

        let next = [0, 1, 2, 3, 4, 5, 6, 7][(ant.smallNumber + 1) % 8];

        nextMoveSquareTemp = funcsArray[(antIndex + next) % funcsArray.length](ant.coordinates);

        ant.smallNumber = next as any;

      }

      return nextMoveSquareTemp;
    }

    function isMoveIleagal(coords: Coordinates, surroundings: GameSquare[], width: number, height: number) {
      let { x, y } = coords;
      let surroundingSquare = surroundings.find(s => s.coordinates.x == x && s.coordinates.y == y);
      return (x < 0 || x > width - 1 ||
        y < 0 || y > height - 1)
        || surroundingSquare.ant
        || surroundingSquare.foodPile
        || surroundingSquare.colony
    }
  }
}