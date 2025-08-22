
import JobProfiler from "./Common/Utils/JobProfiler";
import { AppDataSource } from "./Common/data-source";
import { App } from "./app";
const jobProfiler = new JobProfiler()

class Server {

    public express: App;

    constructor() {
        this.connectToDatabase();
        this.express = new App();

    }

    private connectToDatabase() {
        AppDataSource.initialize()
            .then(() => {
                jobProfiler.runJobs();

            })
            .catch((err: any) => {
                console.error("Error during Data Source initialization", err)
            })
    }
}


new Server()