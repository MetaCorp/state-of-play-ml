import React, { useState, useEffect } from 'react';

import * as tf from '@tensorflow/tfjs';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import './App.css';

import Steps from './Steps'

import cx from 'classnames';

const mobilenet = require('@tensorflow-models/mobilenet');

const { getFilesFromDataTransferItems } = require('datatransfer-files-promise')



const App = () => {

  const [knn, setKnn] = useState(null);
  const [net, setNet] = useState(null);

  const [tagList, setTagList] = useState([]);
  const [tags, setTags] = useState({});
  const [datasetLoading, setDatasetLoading] = useState(false);

  const [isTraining, setIsTraining] = useState(false);
  const [isTrained, setIsTrained] = useState(false);

  const [results, setResults] = useState([]);
  const [resultLoading, setResultLoading] = useState(false);

  const [step, setStep] = useState(0);

  const [imageCount, setImageCount] = useState(0);
  const [imageTotal, setImageTotal] = useState(null);

  const [steps, setSteps] = useState([{
    step: "Loading model..."
  }, {
    step: "Drop a folder containing the dataset",
  }, {
    step: "Loading...",
  }, {
    step: "Training...",
    // progress: imageCount / imageTotal * 100
  }, {
    step: "Drop an image",
  }]);

  

  useEffect(() => {
    setKnn(knnClassifier.create())
    const loadNet = async () => {
      setNet(await mobilenet.load())
      setStep(1)
    }
    loadNet()
  }, []);

  const handleDatasetDrop = e => {
    e.preventDefault()
    e.stopPropagation()

    if (step < 1) return

    if (isTrained) {
      handleImageDrop(e)
    }
    else {
      handleDatasetLoad(e)
    }
  }

  const handleDatasetLoad = async e => {
    setStep(2)
    setDatasetLoading(true)

    const tagList = []
    const tags = {}

    console.log('files 1', e.dataTransfer.files)
    const files = await getFilesFromDataTransferItems(e.dataTransfer.items)
    console.log('files 2', files)
    const imageFiles = files.filter(file => file.type === "image/jpeg")
    setImageTotal(imageFiles.length)
    imageFiles.forEach((file, i) => {
      const tag = file.filepath.substring(file.filepath.indexOf('/') + 1, file.filepath.lastIndexOf('/'))
      
      if (!tagList.includes(tag)) {
        tagList.push(tag)
        tags[tag] = []
      }

      tags[tag].push(file)

    })

    console.log({ tagList, tags })

    setDatasetLoading(false)
    setTagList(tagList)
    setTags(tags)
    
    handleTrain(tagList, tags)// to override state that are not yet updated
  }
  
  const handleTrain = (tagList, tags) => {
    setStep(3)
    setIsTraining(true)

    console.log({ tagList, tags })

    console.log('tags count: ' + tagList.length)

    let tagLoadedCount = 0
    tagList.map((tag, i) => {

      console.log()
      console.log(tag + ' :')
      
      let imageCount = 0
      
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

            // setImageCount(imageCount + 1)
            imageCount++
            // console.log({ imageCount })

            if (imageCount == tags[tag].length) {
              console.log('training ' + tag + ' done')
              tagLoadedCount++
              console.log('tagLoadedCount: ' + tagLoadedCount + '/' + tagList.length)

              if (tagLoadedCount == tagList.length) {
                setIsTraining(false)
                setStep(4)

              }
            }
          };
          
        }, false);
        
        setIsTrained(true)
        reader.readAsDataURL(file);

      })
    })
  }

  const handleImageDrop = e => {
    setResultLoading(true)
    setStep(step + 1)
    setSteps([
      ...steps, {
        step: "Loading predictions...",
      }
    ])

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

        const confidenceList = []
        const confidences = {};

        console.log({ tagList })

        Object.keys(result.confidences).map(function(key, index) {
          confidenceList.push(tagList[key])
          confidences[tagList[key]] = result.confidences[key];
        });

        confidenceList.sort((a, b) => confidences[b] - confidences[a])
        
        console.log('predict result: ', {
          label: tagList[result.classIndex],
          confidences,
          confidenceList,
          result
        })

        
        setStep(step + 1)
        setSteps([
          ...steps, {
            step: <span>
              <span>Prédictions :</span>
              <ul>
                {confidenceList.filter(confidence => confidences[confidence] >= 0.1).map(tag => <li key={tag}>{tag + ' : ' + confidences[tag]}</li>)}
              </ul>
            </span>,
          }
        ])
        setResults([
          ...results, {
            label: tagList[result.classIndex],
            confidences,
            confidenceList
          }
        ])

        // Dispose image when done
        image.dispose();
        activation.dispose();
        
        setResultLoading(false)
        // await sleep(100);
      };

    }, false);

    reader.readAsDataURL(e.dataTransfer.files[0]);
  }// Step todo :

  return (
    <div className="App" onDragOver={e => e.preventDefault()} onDrop={handleDatasetDrop}>
      <header className="App-header">
        <Steps
          items={steps}
          step={step}
          />
        {/* <p>{tagList.length > 0 ? "Dataset loaded" : datasetLoading ? "Loading dataset..." : "drop a folder containing the dataset"}</p> */}
        {/* {tagList.length > 0 && (isTraining ? <p>Training...</p> : isTrained ? <p>Model trained</p> : <button onClick={handleTrain}>Train</button>)} */}
        {/* {isTrained && (resultLoading ? "Loading predictions..." : "Drop an image")} */}
        {/* {result && !resultLoading && <ul>{result.confidenceList.map(tag => <li key={tag}>{tag + ' : ' + result.confidences[tag]}</li>)}</ul>} */}
      </header>
    </div>
  );
}

export default App;
