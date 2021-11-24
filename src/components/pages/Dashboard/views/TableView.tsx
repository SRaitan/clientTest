import axios from "axios";
import * as t from "io-ts";
import { PathReporter } from "io-ts/PathReporter";
import React, {useCallback} from "react";
import assertNever from "../../../utils/assertNever";
import endpoint from "../../../utils/endpoint";
import ErrorView from "./views/ErrorView";
import LoadingView from "./views/LoadingView";
import TableView from "./views/TableView";

const resType = t.type({
    year: t.number,
    caregivers: t.array(
        t.type({
            name: t.string,
            patients: t.array(t.string)
        })
    )
});

export type Report = t.TypeOf<typeof resType>;

export class LastRefresh extends React.Component {
    refreshDate: Date = new Date(0)
}

type State =
    | {
    type: "Initial";
}
    | {
    type: "Resolved";
    report: Report;
    isRefreshing: boolean;
}
    | {
    type: "Refresh";
    report: Report;
    isRefreshing: boolean;
}
    | {
    type: "Rejected";
    error: string;
};

let lastRefresh = new LastRefresh(new Date(0)) // 1/1/1970

function useDashboard(params: { year: number }) {
    const [state, setState] = React.useState<State>({ type: "Initial" });
    const [state2, setRef] = React.useState<LastRefresh>(lastRefresh);

    const startLoading = () => {
        setState((prevState) => {
            switch (prevState.type) {
                case "Initial":
                case "Refresh":
                case "Rejected":
                    return { type: "Initial"};
                case "Resolved":
                    return { ...prevState, isRefreshing: true };
            }
        });
    };
    const fetchReport = React.useCallback(() => {
        startLoading();
        return axios.get<unknown>(endpoint(`reports/${params.year}`))
            .then((response) => {
                if (!resType.is(response.data)) {
                    console.error(PathReporter.report(resType.decode(response)).join(", "));
                    throw new Error("Error");
                }
                setState({ type: "Resolved", report: response.data, isRefreshing: false });
            })
            .catch(() => {
                setState({ type: "Rejected", error: "Error" });
            });
    }, [params.year, state2]);

    React.useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    return { state, setRef, actions: { fetchReport } };
}

const Dashboard = () => {
    const { state, setRef, actions } = useDashboard({ year: 2021 });

    switch (state.type) {
        case "Initial":
        case "Refresh":
            return <LoadingView />;
        case "Rejected":
            return <ErrorView message={state.error} onClickRetry={actions.fetchReport} />;
        case "Resolved":
            const b = {report: state.report, type: state.type, isRefreshing: state.isRefreshing, state2: setRef};
            return <TableView {...b} />;
        default:
            assertNever(state);
            return <></>;
    }
};

export default Dashboard;
