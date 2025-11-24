pipeline {
    agent any

    environment {
        SCAN_DIR = "${WORKSPACE}/scan-reports"
        PATH = "${WORKSPACE}/tools:$HOME/.local/bin:/usr/local/bin:${env.PATH}"
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
                mkdir -p ${SCAN_DIR} ${WORKSPACE}/tools
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

        stage('SCA Dependency-Check') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    sh '''
                    /usr/local/bin/dependency-check --project "Transition-Services" --scan . --format HTML --out ${SCAN_DIR} || true
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
                sleep 15  # wait for app to be ready
                '''
            }
        }

        stage('DAST Scan (OWASP ZAP)') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    sh '''
                    /usr/local/bin/zap -cmd -quickurl http://localhost:3000 -quickout ${SCAN_DIR}/zap-report.xml || true
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

