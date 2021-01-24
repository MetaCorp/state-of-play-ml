import React, { useState, useEffect } from 'react';

import * as tf from '@tensorflow/tfjs';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import './App.css';

import Steps from './Steps'

import GetAppIcon from '@material-ui/icons/GetApp';
import IconButton from '@material-ui/core/IconButton';

import { saveAs } from 'file-saver';

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
    step: "Finding best K..."
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
  
  const handleLoadImageFromFile = (file) => new Promise((res, rej) => {
    // console.log({ file })
    var imgEl = document.createElement('img');
    var reader  = new FileReader();
    
    reader.onload = function() {
      imgEl.src = reader.result;
      imgEl.onload = function() {
        // access image size here 
        imgEl.width = this.width
        imgEl.height = this.height

        // console.log({ file2: file })

        res(imgEl)
      };

      // TODO : reject on error
      
    };

    reader.onerror = function(event) {
      console.log('REJECT: ', reader.error)
      rej(reader.error)
      reader.abort();
    };

    
    reader.addEventListener('abort', () => {
      console.log('REJECT: ')
      rej()
      console.error(`Error occurred reading file: ${file.name}`);
    });

    reader.readAsDataURL(file);
  })
  
  const handleTrain = (tagList, tags) => {
    setStep(3)
    setIsTraining(true)

    // console.log({ tagList, tags })

    console.log('tags count: ' + tagList.length)

    let tagLoadedCount = 0
    tagList.map((tag, i) => {

      console.log()
      console.log(tag + ' :')
      
      let imageCount = 0
      
      tags[tag].map(async (file) => {

        const imgEl = await handleLoadImageFromFile(file)

        // console.log({ tag, imageCount, imgEl })

        if (imgEl) {
          // console.log({ tag, files: tags[tag], file, imageCount, tagLoadedCount })
  
          // Get image data from video element
          const image = tf.browser.fromPixels(imgEl);
  
          // 'conv_preds' is the logits activation of MobileNet.
          const activation = net.infer(image, true);// 'conv_preds');
      
          // Add current image to classifier
          knn.addExample(activation, i)
      
          // Dispose image when done
          image.dispose();
          activation.dispose();
  
          
        }

        // setImageCount(imageCount + 1)
        imageCount++
        // console.log({ imageCount })

        if (imageCount === tags[tag].length) {
          console.log('training ' + tag + ' done')
          tagLoadedCount++
          console.log('tagLoadedCount: ' + tagLoadedCount + '/' + tagList.length)

          if (tagLoadedCount === tagList.length) {
            setIsTraining(false)
            setIsTrained(true)
            handleFindBestK(tagList, tags)

          }
        }

      })
    })
  }

  const getConfidences = (tagList, result) => {
    
    const confidenceList = []
    const confidences = {};

    Object.keys(result.confidences).map(function(key) {
      confidenceList.push(tagList[key])
      confidences[tagList[key]] = result.confidences[key];
    });

    confidenceList.sort((a, b) => confidences[b] - confidences[a])

    return {
      confidenceList,
      confidences
    }
  }

  // - results
  //   - tags
  //     - Bar
  //     - files
  //       - Porte.jpg
  //       - results

  const handleFindBestK = async (tagList, tags) => {
    setStep(4)

    const K_COUNT = 15

    const results = []

    for (let i = 0; i < tagList.length; i++) {
      const tag = tagList[i];

      console.log('finding best k for ' + tag)
    
      results.push({
        tag,
        files: []
      })

      for (let j = 0; j < tags[tag].length && j < 40; j++) {
        const file = tags[tag][j];
        
        const imgEl = await handleLoadImageFromFile(file)

        const image = tf.browser.fromPixels(imgEl);

        const activation = net.infer(image, 'conv_preds');

        results[i].files.push({
          filename: file.name,
          results: []
        })

        for (let l = 1; l <= K_COUNT; l++) {

          let k
          const result = await knn.predictClass(
            activation,
            k = l
          );
          
          const { confidenceList, confidences } = getConfidences(tagList, result)
          
          results[i].files[j].results.push({
            confidenceList,
            confidences
          })
          
        }

        image.dispose();
        activation.dispose();

      }

    }

    console.log({ results })

    const parsedResults = []

    for (let m = 1; m <= K_COUNT; m++) {
      let total = 0
      let count = 0

      results.map(r => {
        r.files.map(file => {

          // console.log({ filterdConfidenceList: file.results[m - 1].confidenceList.filter(tag => file.results[m - 1].confidences[tag] > 0)})

          if (file.results[m - 1].confidenceList.filter(tag => file.results[m - 1].confidences[tag] > 0).includes(r.tag)) {
            
            // console.log({ index: file.results[m - 1].confidenceList.indexOf(r.tag) })

            total += (file.results[m - 1].confidenceList.length - file.results[m - 1].confidenceList.indexOf(r.tag)) / file.results[m - 1].confidenceList.length
          }
          
          count++
        })
      })

      console.log({ total, count })
      
      parsedResults.push(total / count)
    }

    console.log({ parsedResults })

    setStep(5)

  }

  const handleImageDrop = async e => {
    if (step < 5) return

    setResultLoading(true)
    setStep(step + 1)
    setSteps([
      ...steps, {
        step: "Loading predictions...",
      }
    ])

    const imgEl = await handleLoadImageFromFile(e.dataTransfer.files[0])

    // Get image data from video element
    const image = tf.browser.fromPixels(imgEl);

    // 'conv_preds' is the logits activation of MobileNet.
    const activation = net.infer(image, 'conv_preds');

    let k
    const result = await knn.predictClass(
      activation,
      k = 1
    );

    const { confidenceList, confidences } = getConfidences(tagList, result)
    
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
  }

  const handleExport = () => {
    let dataset = knn.getClassifierDataset()
    var datasetObj = {}
    Object.keys(dataset).forEach((key) => {
      let data = dataset[key].dataSync();
      // use Array.from() so when JSON.stringify() it covert to an array string e.g [0.1,-0.2...] 
      // instead of object e.g {0:"0.1", 1:"-0.2"...}
      datasetObj[key] = Array.from(data); 
    });
    let jsonStr = JSON.stringify(datasetObj)
    //can be change to other source
    const filename = 'model.json'

    var fileToSave = new Blob([jsonStr], {
      type: 'application/json',
      name: filename
    });
    
    // Save the file
    saveAs(fileToSave, filename);
  }

  return (
    <div className="App" onDragOver={e => e.preventDefault()} onDrop={handleDatasetDrop}>
      {step > 3 && <IconButton style={{ position: 'fixed', top: 20, right: 20, color: 'white' }} onClick={handleExport} >
        <GetAppIcon />
      </IconButton>}
      <header className="App-header">
        <Steps
          items={steps}
          step={step}
          />
      </header>
    </div>
  );
}

export default App;
