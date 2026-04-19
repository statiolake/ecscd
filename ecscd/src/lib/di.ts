import { ApplicationUsecase, IApplicationUsecase } from "./usecase/application";
import { DeploymentUsecase } from "./usecase/deployment";
import { AWS } from "./infrastructure/aws";
import { GitHub } from "./infrastructure/github";
import {
  SqliteApplicationRepository,
  SqliteConnection,
  SqliteFilterRepository,
} from "./infrastructure/sqlite";
import {
  DynamoDbApplicationRepository,
  DynamoDbConnection,
  DynamoDbFilterRepository,
} from "./infrastructure/dynamodb";
import { FilterUsecase } from "./usecase/filter";
import { AwsServiceStateProvider } from "./infrastructure/service-state-provider";
import { DefaultApplicationObserver } from "./usecase/application-observer";
import { SystemClock } from "./infrastructure/system-clock";
import { UuidGenerator } from "./infrastructure/uuid-generator";
import { ApplicationRepository } from "./repository/application";
import { FilterRepository } from "./repository/filter";

function createRepositories(): {
  applications: ApplicationRepository;
  filters: FilterRepository;
} {
  const dbType = process.env.DATABASE_TYPE || "sqlite";

  switch (dbType.toLowerCase()) {
    case "dynamodb": {
      const region = process.env.AWS_REGION || "us-east-1";
      const tableName = process.env.DYNAMODB_TABLE_NAME || "ECSCD";
      const connection = new DynamoDbConnection(region, tableName);
      return {
        applications: new DynamoDbApplicationRepository(connection),
        filters: new DynamoDbFilterRepository(connection),
      };
    }
    case "sqlite":
    default: {
      const dbPath = process.env.SQLITE_DB_PATH || "./ecscd.db";
      const connection = new SqliteConnection(dbPath);
      return {
        applications: new SqliteApplicationRepository(connection),
        filters: new SqliteFilterRepository(connection),
      };
    }
  }
}

const { applications: ar, filters: fr } = createRepositories();
const aws = new AWS();
const github = new GitHub(process.env.GITHUB_TOKEN || "");
const observer = new DefaultApplicationObserver(
  new AwsServiceStateProvider(aws),
  aws,
  github,
);
const clock = new SystemClock();
const idGenerator = new UuidGenerator();

export const au: IApplicationUsecase = new ApplicationUsecase(ar, observer);
export const du = new DeploymentUsecase(ar, aws, github);
export const fu = new FilterUsecase(fr, clock, idGenerator);
