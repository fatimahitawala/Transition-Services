pipeline {
    agent any

    environment {
        SCAN_DIR = "${WORKSPACE}/scan-reports"
        PATH = "${WORKSPACE}/tools:$HOME/.local/bin:/usr/local/bin:${env.PATH}"
        DC_DATA_DIR = "/var/lib/jenkins/dependency-check-data" // custom database location
        APP_URL = "http://localhost:3000" // app URL for ZAP scan
    }

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Setup Environment') {
            steps {
                sh '''
                mkdir -p ${SCAN_DIR} ${WORKSPACE}/tools ${DC_DATA_DIR}
                echo "Directory structure:"
                tree -L 3 ${WORKSPACE} || true
                '''
            }
        }

        stage('Install App Dependencies') {
            steps {
                sh 'npm install --legacy-peer-deps || true'
            }
        }

        stage('Run ESLint') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    sh '''
                    npm install eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin --legacy-peer-deps
                    npx eslint . --ext .js,.ts -f json -o ${SCAN_DIR}/eslint-report.json || true
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'scan-reports/eslint-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('Install Security Tools') {
            steps {
                sh '''
                export PATH=$HOME/.local/bin:$PATH

                python3 -m pip install --upgrade pip --user
                python3 -m pip install --user semgrep checkov

                ln -sf $HOME/.local/bin/semgrep ${WORKSPACE}/tools/semgrep
                ln -sf $HOME/.local/bin/checkov ${WORKSPACE}/tools/checkov

                curl -sSfL https://github.com/gitleaks/gitleaks/releases/download/v8.18.1/gitleaks_8.18.1_linux_x64.tar.gz | tar xz -C ${WORKSPACE}/tools

                curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b ${WORKSPACE}/tools

                ${WORKSPACE}/tools/semgrep --version || echo "Semgrep install failed"
                ${WORKSPACE}/tools/checkov --version || echo "Checkov install failed"
                ${WORKSPACE}/tools/trivy --version || echo "Trivy install failed"
                ${WORKSPACE}/tools/gitleaks version || echo "Gitleaks install failed"
                '''
            }
        }

        stage('SAST Scan (Semgrep)') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    sh "${WORKSPACE}/tools/semgrep scan --config auto --json --output ${SCAN_DIR}/semgrep-results.json . || true"
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'scan-reports/semgrep-results.json', allowEmptyArchive: true
                }
            }
        }

        stage('Secrets Detection (Gitleaks)') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    sh "${WORKSPACE}/tools/gitleaks detect --source=. --report-path=${SCAN_DIR}/gitleaks-report.json --redact || true"
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'scan-reports/gitleaks-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('SCA Dependency Scan (Trivy)') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    sh "${WORKSPACE}/tools/trivy fs --scanners vuln,misconfig --format json --output ${SCAN_DIR}/trivy-deps-results.json --exit-code 0 --severity HIGH,CRITICAL . || true"
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'scan-reports/trivy-deps-results.json', allowEmptyArchive: true
                }
            }
        }

        stage('Dependency-Check Update DB') {
            steps {
                sh '''
                mkdir -p ${DC_DATA_DIR}
                /usr/local/bin/dependency-check --updateonly --data ${DC_DATA_DIR}
                '''
            }
        }

        stage('SCA Dependency-Check') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    sh '''
                    /usr/local/bin/dependency-check \
                    --project "Transition-Services" \
                    --scan ${WORKSPACE} \
                    --format HTML \
                    --out ${SCAN_DIR} \
                    --data ${DC_DATA_DIR} \
                    --enableExperimental || true
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'scan-reports/dependency-check-report.html', allowEmptyArchive: true
                }
            }
        }

        stage('Start App for DAST') {
            steps {
                sh '''
                nohup npm start &
                sleep 15  # wait for app to start
                '''
            }
        }

        stage('Wait for App Health') {
            steps {
                // Wait until the app responds on port 3000 (adjust URL if needed)
                sh '''
                echo "Waiting for app to be ready at ${APP_URL}..."
                for i in {1..30}; do
                    if curl -s --head ${APP_URL} | grep "200 OK" > /dev/null; then
                        echo "App is up!"
                        exit 0
                    fi
                    echo "App not ready yet, waiting 5 seconds..."
                    sleep 5
                done
                echo "App failed to start after 150 seconds"
                exit 1
                '''
            }
        }

        stage('DAST Scan (OWASP ZAP)') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    sh '''
                    /usr/local/bin/zap -cmd -quickurl ${APP_URL} -quickout ${SCAN_DIR}/zap-report.xml || true
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'scan-reports/zap-report.xml', allowEmptyArchive: true
                }
            }
        }

    }

    post {
        always {
            archiveArtifacts artifacts: 'scan-reports/**/*', allowEmptyArchive: true
        }
    }
}

