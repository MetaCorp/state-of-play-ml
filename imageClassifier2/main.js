// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import "@babel/polyfill";
// import * as mobilenetModule from '@tensorflow-models/mobilenet';
const mobilenet = require('@tensorflow-models/mobilenet');
import * as tf from '@tensorflow/tfjs';
import * as knnClassifier from '@tensorflow-models/knn-classifier';


const { getFilesFromDataTransferItems } = require('datatransfer-files-promise')

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// Number of classes to classify
const NUM_CLASSES = 3;
// Webcam Image size. Must be 227. 
const IMAGE_SIZE = 227;
// K value for KNN
const TOPK = 10;

class Main {
  constructor() {
    // Initiate variables
    this.infoTexts = [];
    this.training = -1; // -1 when no class is being trained
    this.videoPlaying = false;

    // Initiate deeplearn.js math and knn classifier objects
    this.bindPage();

    // Create video element that will contain the webcam image
    // this.video = document.createElement('video');
    // this.video.setAttribute('autoplay', '');
    // this.video.setAttribute('playsinline', '');

    // Add video element to DOM
    // document.body.appendChild(this.video);

    // Create training buttons and info texts    
    // for (let i = 0; i < NUM_CLASSES; i++) {
    //   const div = document.createElement('div');
    //   document.body.appendChild(div);
    //   div.style.marginBottom = '10px';

    //   // Create training button
    //   const button = document.createElement('button')
    //   button.innerText = "Train " + i;
    //   div.appendChild(button);

    //   // Listen for mouse events when clicking the button
    //   button.addEventListener('mousedown', () => this.training = i);
    //   button.addEventListener('mouseup', () => this.training = -1);

    //   // Create info text
    //   const infoText = document.createElement('span')
    //   infoText.innerText = " No examples added";
    //   div.appendChild(infoText);
    //   this.infoTexts.push(infoText);
    // }


    // Setup webcam
    // navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    //   .then((stream) => {
    //     this.video.srcObject = stream;
    //     this.video.width = IMAGE_SIZE;
    //     this.video.height = IMAGE_SIZE;

    //     this.video.addEventListener('playing', () => this.videoPlaying = true);
    //     this.video.addEventListener('paused', () => this.videoPlaying = false);
    //   })

    this.datasetLoaded = false
    
    const tagList = []
    const tags = {}

    window.addEventListener('dragover', evt => evt.preventDefault())
    window.addEventListener('drop', async evt => {
      evt.preventDefault()

      if (!this.datasetLoaded) {
        console.log('files 1', evt.dataTransfer.files)
        const files = await getFilesFromDataTransferItems(evt.dataTransfer.items)
        console.log('files 2', files)

        files.forEach((file, i) => {
          const tag = file.filepath.substring(file.filepath.indexOf('/') + 1, file.filepath.lastIndexOf('/'))
          
          if (!tagList.includes(tag)) {
            tagList.push(tag)
            tags[tag] = []
          }
  
          tags[tag].push(file)
  
        })
  
        this.datasetLoaded = true

        // this.drawTags()
        this.train(tagList, tags, this.net, this.knn)
      }
      else {
        console.log('predict: ', evt.dataTransfer.files[0])
        this.predict(evt.dataTransfer.files[0], tagList, this.net, this.knn)
      }
    })

  }

  drawTags() {
    const ul = document.createElement('ul');
    document.body.appendChild(ul);

    this.tagList.map(tag => {
      const tagEl = document.createElement('li');
      tagEl.innerText = tag
      ul.appendChild(tagEl);

      this.tags[tag].map(file => {
        const img = document.createElement("img");
        console.log(file)

        var reader = new FileReader();
        img.title = file.name
        reader.onload = function(event) {
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);

        tagEl.appendChild(img)
      })
    })
  }

  async bindPage() {
    this.knn = knnClassifier.create();
    this.net = await mobilenet.load();
    console.log('mobilenet loaded', this.net)
  }

  async train(tagList, tags, net, knn) {
    
    tagList.map((tag, i) => {
      
      
      let imageLoadedCount = 0
      tags[tag].map((file) => {

        var imgEl = document.createElement('img');
        var reader  = new FileReader();
        
        reader.addEventListener("load", function() {
          imgEl.src = reader.result;
          imgEl.onload = function() {
            // access image size here 
            imgEl.width = this.width
            imgEl.height = this.height


            // Get image data from video element
            const image = tf.browser.fromPixels(imgEl);

            // 'conv_preds' is the logits activation of MobileNet.
            const activation = net.infer(image, true);// 'conv_preds');
        
            // Add current image to classifier
            knn.addExample(activation, i)
        
            // Dispose image when done
            image.dispose();
            activation.dispose();
            // await sleep(100);
            imageLoadedCount++
            if (imageLoadedCount == tags[tag].length - 1)
              console.log('training ' + tag + ' done')
          };

        }, false);

        reader.readAsDataURL(file);

      })
    })
  }

  async predict(file, tagList, net, knn) {
    var imgEl = document.createElement('img');

    var reader  = new FileReader();
    reader.addEventListener("load", function() {
      imgEl.src = reader.result;
      imgEl.onload = async function() {
        // access image size here 
        imgEl.width = this.width
        imgEl.height = this.height


        // Get image data from video element
        const image = tf.browser.fromPixels(imgEl);
    
        // 'conv_preds' is the logits activation of MobileNet.
        const activation = net.infer(image, 'conv_preds');

        const result = await knn.predictClass(activation);

        var confidences = {};

        Object.keys(result.confidences).map(function(key, index) {
          confidences[tagList[key]] = result.confidences[key];
        });
        
        console.log('predict result: ', {
          label: tagList[result.classIndex],
          confidences: confidences,
          result: result
        })

        // Dispose image when done
        image.dispose();
        activation.dispose();
        // await sleep(100);
      };

    }, false);

    reader.readAsDataURL(file);
  }
}

window.addEventListener('load', () => new Main());