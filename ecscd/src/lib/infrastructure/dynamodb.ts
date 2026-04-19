import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ApplicationDomain } from "../domain/application";
import { FilterDomain } from "../domain/filter";
import { ApplicationRepository } from "../repository/application";
import { FilterRepository } from "../repository/filter";

interface ApplicationsModel {
  name: string;
  item_type?: string;
  git_repo: string;
  git_branch: string;
  git_path: string;
  ecs_cluster: string;
  ecs_service: string;
  aws_region: string;
  aws_role_arn: string;
  aws_external_id: string;
  created_at: string;
  updated_at: string;
}

interface FiltersModel {
  id: string;
  item_type: string;
  name: string;
  filter_name: string;
  pattern: string;
  created_at: string;
  updated_at: string;
}

export class DynamoDbConnection {
  readonly client: DynamoDBDocumentClient;
  readonly tableName: string;

  constructor(region: string, tableName: string = "ECSCD") {
    const dynamoDBClient = new DynamoDBClient({ region });
    this.client = DynamoDBDocumentClient.from(dynamoDBClient);
    this.tableName = tableName;
  }
}

export class DynamoDbApplicationRepository implements ApplicationRepository {
  constructor(private connection: DynamoDbConnection) {}

  async getApplications(): Promise<ApplicationDomain[]> {
    try {
      const command = new ScanCommand({
        TableName: this.connection.tableName,
        FilterExpression: "item_type = :item_type",
        ExpressionAttributeValues: {
          ":item_type": "application",
        },
      });

      const response = await this.connection.client.send(command);
      const items = response.Items || [];

      const applications = items.map((item) =>
        mapItemToApplication(item as ApplicationsModel),
      );

      return applications.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (error) {
      throw new Error(`Failed to get applications: ${error}`);
    }
  }

  async getApplicationNames(): Promise<string[]> {
    try {
      const command = new ScanCommand({
        TableName: this.connection.tableName,
        FilterExpression: "item_type = :item_type",
        ExpressionAttributeValues: {
          ":item_type": "application",
        },
        ProjectionExpression: "#name, created_at",
        ExpressionAttributeNames: {
          "#name": "name",
        },
      });

      const response = await this.connection.client.send(command);
      const items = response.Items || [];

      return items
        .sort((a, b) => {
          const dateA = new Date(a.created_at as string).getTime();
          const dateB = new Date(b.created_at as string).getTime();
          return dateB - dateA;
        })
        .map((item) => item.name as string);
    } catch (error) {
      throw new Error(`Failed to get application names: ${error}`);
    }
  }

  async getApplication(name: string): Promise<ApplicationDomain | null> {
    try {
      const command = new GetCommand({
        TableName: this.connection.tableName,
        Key: { name },
      });
      const response = await this.connection.client.send(command);
      if (!response.Item) {
        return null;
      }
      if ((response.Item as ApplicationsModel).item_type !== "application") {
        return null;
      }
      return mapItemToApplication(response.Item as ApplicationsModel);
    } catch (error) {
      throw new Error(`Failed to get application: ${error}`);
    }
  }

  async createApplication(application: ApplicationDomain): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.connection.tableName,
        Item: {
          name: application.name,
          item_type: "application",
          git_repo: application.gitConfig.repo,
          git_branch: application.gitConfig.branch,
          git_path: application.gitConfig.path,
          ecs_cluster: application.ecsConfig.cluster,
          ecs_service: application.ecsConfig.service,
          aws_region: application.awsConfig.region,
          aws_role_arn: application.awsConfig.roleArn,
          aws_external_id: application.awsConfig.externalId,
          created_at: application.createdAt.toISOString(),
          updated_at: application.updatedAt.toISOString(),
        },
        ConditionExpression: "attribute_not_exists(#name)",
        ExpressionAttributeNames: {
          "#name": "name",
        },
      });

      await this.connection.client.send(command);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new Error(
          `Application with name '${application.name}' already exists`,
        );
      }
      throw new Error(`Failed to create application: ${error}`);
    }
  }

  async updateApplication(application: ApplicationDomain): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.connection.tableName,
        Key: {
          name: application.name,
        },
        UpdateExpression: `SET
          item_type = :item_type,
          git_repo = :git_repo,
          git_branch = :git_branch,
          git_path = :git_path,
          ecs_cluster = :ecs_cluster,
          ecs_service = :ecs_service,
          aws_region = :aws_region,
          aws_role_arn = :aws_role_arn,
          aws_external_id = :aws_external_id,
          updated_at = :updated_at`,
        ExpressionAttributeValues: {
          ":item_type": "application",
          ":git_repo": application.gitConfig.repo,
          ":git_branch": application.gitConfig.branch,
          ":git_path": application.gitConfig.path,
          ":ecs_cluster": application.ecsConfig.cluster,
          ":ecs_service": application.ecsConfig.service,
          ":aws_region": application.awsConfig.region,
          ":aws_role_arn": application.awsConfig.roleArn,
          ":aws_external_id": application.awsConfig.externalId,
          ":updated_at": application.updatedAt.toISOString(),
        },
        ConditionExpression: "attribute_exists(#name)",
        ExpressionAttributeNames: {
          "#name": "name",
        },
      });

      await this.connection.client.send(command);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new Error(
          `Application with name '${application.name}' does not exist`,
        );
      }
      throw new Error(`Failed to update application: ${error}`);
    }
  }

  async deleteApplication(name: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.connection.tableName,
        Key: {
          name: name,
        },
        ConditionExpression: "attribute_exists(#name)",
        ExpressionAttributeNames: {
          "#name": "name",
        },
      });

      await this.connection.client.send(command);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new Error(`Application with name '${name}' does not exist`);
      }
      throw new Error(`Failed to delete application: ${error}`);
    }
  }
}

export class DynamoDbFilterRepository implements FilterRepository {
  constructor(private connection: DynamoDbConnection) {}

  async getFilters(): Promise<FilterDomain[]> {
    try {
      const command = new ScanCommand({
        TableName: this.connection.tableName,
        FilterExpression: "item_type = :item_type",
        ExpressionAttributeValues: {
          ":item_type": "filter",
        },
      });

      const response = await this.connection.client.send(command);
      const items = response.Items || [];

      const filters = items.map((item) =>
        mapItemToFilter(item as FiltersModel),
      );

      return filters.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (error) {
      throw new Error(`Failed to get filters: ${error}`);
    }
  }

  async getFilterById(id: string): Promise<FilterDomain | null> {
    try {
      const command = new GetCommand({
        TableName: this.connection.tableName,
        Key: {
          name: `filter#${id}`,
        },
      });

      const response = await this.connection.client.send(command);
      if (!response.Item) {
        return null;
      }

      return mapItemToFilter(response.Item as FiltersModel);
    } catch (error) {
      throw new Error(`Failed to get filter: ${error}`);
    }
  }

  async createFilter(filter: FilterDomain): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.connection.tableName,
        Item: {
          name: `filter#${filter.id}`,
          id: filter.id,
          item_type: "filter",
          filter_name: filter.name,
          pattern: filter.pattern,
          created_at: filter.createdAt.toISOString(),
          updated_at: filter.updatedAt.toISOString(),
        },
        ConditionExpression: "attribute_not_exists(#name)",
        ExpressionAttributeNames: {
          "#name": "name",
        },
      });

      await this.connection.client.send(command);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new Error(`Filter with id '${filter.id}' already exists`);
      }
      throw new Error(`Failed to create filter: ${error}`);
    }
  }

  async deleteFilter(id: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.connection.tableName,
        Key: {
          name: `filter#${id}`,
        },
      });

      await this.connection.client.send(command);
    } catch (error) {
      throw new Error(`Failed to delete filter: ${error}`);
    }
  }
}

function mapItemToApplication(item: ApplicationsModel): ApplicationDomain {
  return {
    name: item.name,
    gitConfig: {
      repo: item.git_repo,
      branch: item.git_branch,
      path: item.git_path,
    },
    ecsConfig: {
      cluster: item.ecs_cluster,
      service: item.ecs_service,
    },
    awsConfig: {
      region: item.aws_region,
      roleArn: item.aws_role_arn,
      externalId: item.aws_external_id,
    },
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at),
  };
}

function mapItemToFilter(item: FiltersModel): FilterDomain {
  return {
    id: item.id,
    name: item.filter_name,
    pattern: item.pattern,
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at),
  };
}
