#!groovy
pipeline {
  agent {
    label 'linux'
  }

  environment {
    SERVICE_NAME = 'integration_test' // image name
    GIT_NAME = 'Jenkins'
    GIT_EMAIL = 'jenkins@centrality.ai'
    GIT_BRANCH = 'master'
    DOCKER_IMAGE_NAME = 'integration_test'
  }

  stages {
    // stage('Build test image') {
    //   steps {
    //     echo 'Build test image...'
    //     sh 'docker build -f integration_test/Dockerfile -t ${DOCKER_IMAGE_NAME} .' 
    //   }
    // }
    stage('Build the test') {
      steps {
        echo 'Build the test...'
        sh 'npm install' 
      }
    }

    // stage('Build cennznet-node image') {
    //   steps {
    //     echo 'Build cennznet-node image...'
    //     sh 'docker build -f integration_test/Dockerfile -t ${DOCKER_IMAGE_NAME} .' 
    //   }
    // }

    stage('Run test') {
      steps {
        echo 'Run integration test...'
        sh 'npm test integration/run.js'
      }
    }
  }
}