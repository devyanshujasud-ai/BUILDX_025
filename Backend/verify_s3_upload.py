import os
import uuid

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from dotenv import load_dotenv


load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME", "potholes-223")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
UPLOAD_PREFIX = os.getenv("AWS_S3_UPLOAD_PREFIX", "potholes")


def main() -> None:
    key = f"{UPLOAD_PREFIX}/s3_upload_test_{uuid.uuid4().hex}.jpg"
    client = boto3.client("s3", region_name=AWS_REGION)

    try:
        client.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=b"codex s3 upload permission test",
            ContentType="image/jpeg",
        )
    except NoCredentialsError:
        raise SystemExit("AWS credentials were not found for the upload test.")
    except ClientError as exc:
        raise SystemExit(f"S3 upload test failed: {exc}") from exc

    if AWS_REGION == "us-east-1":
        url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{key}"
    else:
        url = f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"

    print("S3 upload test passed.")
    print(f"Uploaded object: s3://{BUCKET_NAME}/{key}")
    print(f"Object URL: {url}")


if __name__ == "__main__":
    main()
