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
    TEST_IMAGE_NAME = 'integration_test'
    TEST_CONTAINER_NAME = 'ci_test'
  }

  stages {

    stage('Build test image') {
      steps {
        echo 'Build test image...'
        sh 'docker build -f integration_test/Dockerfile -t ${TEST_IMAGE_NAME} .' 
      }
    }

    stage('Run test') {
      steps {
        echo 'Run integration test...'
        sh 'docker run --rm \
            --name ${TEST_CONTAINER_NAME} \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v /tmp:/tmp \
            ${TEST_IMAGE_NAME} \
            npm testall integration_test/run.js'
      }
    }
  }
}