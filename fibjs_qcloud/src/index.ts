/// <reference types="@fibjs/types" />
import * as ssl from "ssl";
ssl.loadRootCerts();

import {COSObject} from "./COSClient";
import { sigTc3HmacSha256 } from "./helper";
import { SCFClient } from "./SCFClient";

export {
    sigTc3HmacSha256,
    COSObject,
    SCFClient,
}