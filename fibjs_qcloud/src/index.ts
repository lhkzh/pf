/// <reference types="@fibjs/types" />
import * as ssl from "ssl";
ssl.loadRootCerts();

import { sigTc3HmacSha256 } from "./helper";
import {COSObject} from "./COSClient";
import {ApiBase} from "./ApiBase";
import { SCFClient } from "./SCFClient";

export {
    sigTc3HmacSha256,
    COSObject,
    ApiBase,
    SCFClient,
}