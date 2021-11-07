/// <reference types="@fibjs/types" />
import * as ssl from "ssl";
ssl.loadRootCerts();

import { sigTc3HmacSha256 } from "./helper";
import {COSObject, COSBucket} from "./COSClient";
import {ApiBase} from "./ApiBase";
import { SCFClient } from "./SCFClient";
import { STS } from "./STS";

export {
    sigTc3HmacSha256,
    COSBucket,
    COSObject,
    ApiBase,
    SCFClient,
    STS,
}